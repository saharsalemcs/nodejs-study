# سيشن 2: File System, Buffers, Streams, NPM و CLI Tool

| content                     |
| --------------------------- |
| File System                 |
| Blocking vs Non-blocking    |
| Back to File System         |
| Charset و Encoding          |
| Buffers                     |
| Streams                     |
| NPM                         |
| Create and Publish CLI Tool |

---

## 1. الـ File System (`fs`)

**الفكرة:** الـ `fs` module هو اللي بيخلي Node تتعامل مع الملفات والفولدرات (قراءة، كتابة، مسح، إلخ). ده حاجة المتصفح مبيعملهاش، وده من أهم الفروق بين Node والمتصفح.

**أشهر الدوال:**

| الدالة       | بتعمل إيه                                 |
| ------------ | ----------------------------------------- |
| `readFile`   | تقرأ محتوى ملف                            |
| `writeFile`  | تكتب في ملف (ولو موجود بتمسح القديم!)     |
| `appendFile` | تضيف في آخر الملف من غير ما تمسح          |
| `unlink`     | تمسح ملف                                  |
| `mkdir`      | تعمل فولدر                                |
| `readdir`    | تقرأ محتويات فولدر                        |
| `rename`     | تغير اسم أو مكان ملف                      |
| `stat`       | تجيب معلومات عن الملف (الحجم، التاريخ...) |

**كل دالة ليها 3 نسخ:**

```js
import fs from "node:fs";
import fsPromises from "node:fs/promises";

// 1) Synchronous: بتوقف الكود لحد ما تخلص
const data = fs.readFileSync("./note.txt", "utf8");

// 2) Callback: بتكمل والنتيجة بترجع في callback
fs.readFile("./note.txt", "utf8", (err, data) => {
  if (err) return console.error(err);
  console.log(data);
});

// 3) Promises: الأحدث والأنضف (مع async/await)
const data2 = await fsPromises.readFile("./note.txt", "utf8");
```

**نقطة مهمة:** لو معملتيش `'utf8'` في `readFile`، هترجعلك **Buffer** مش نص (هنفهم ليه تحت).

---

## 2. Blocking vs Non-blocking Code

**الفكرة الأساسية:** Node شغالة بـ **thread واحد** للـ JavaScript. يعني لو فيه حاجة وقفت الـ thread ده، **كل حاجة** في البرنامج بتقف.

- **Blocking (Sync):** الكود بيستنى العملية تخلص قبل ما يكمل. أي حاجة تانية متتنفذش في الوقت ده.
- **Non-blocking (Async):** Node بتبعت المهمة للـ OS أو الـ thread pool، وتكمل شغل تاني، ولما المهمة تخلص بترجع النتيجة (callback / promise).

```js
import fs from "node:fs";

console.log("1");

fs.readFile("./big.txt", "utf8", (err, data) => {
  console.log("3: خلصت القراءة");
});

console.log("2");
// الترتيب: 1 ثم 2 ثم 3
```

**مثال بيوضح المشكلة:** تخيلي سيرفر بيخدم 100 مستخدم. لو واحد منهم طلب ملف كبير بـ `readFileSync`، الـ 99 التانيين هيستنوا كلهم!

**القاعدة العملية:**

- في السيرفرات: **استخدمي async دايمًا**.
- الـ Sync مقبول في سكريبتات بسيطة أو CLI أو وقت تشغيل البرنامج (قراءة config مرة واحدة مثلًا).

**الكلام ده مرتبط بـ:** الـ Event Loop، وهو اللي بيدير مين يتنفذ إمتى، وهنرجعله بتفصيل أكتر.

## **ملاحظاتي من الفيديو:**

---

## 3. Back to File System

بعد ما فهمنا الـ blocking، بنرجع للـ fs بس بالطريقة الصح: **`fs/promises` مع `async/await`**.

```js
import fs from "node:fs/promises";

async function main() {
  try {
    await fs.writeFile("./hello.txt", "أهلاً يا Node", "utf8");
    const content = await fs.readFile("./hello.txt", "utf8");
    console.log(content);
  } catch (err) {
    console.error("حصلت مشكلة:", err.message);
  }
}

main();
```

**حاجات لازم تاخدي بالك منها:**

- دايمًا حطي `try/catch` (الملف ممكن مبقاش موجود، أو مفيش صلاحيات).
- استخدمي الـ `path` module لبناء المسارات بدل ما تكتبيها بإيدك:

```js
import path from "node:path";
const filePath = path.join(import.meta.dirname, "data", "users.json");
```

---

## 4. سؤال مهم جدًا: Charset و Encoding

**المشكلة:** الكمبيوتر مبيفهمش حروف، بيفهم **أرقام (bytes)** بس. فلازم فيه اتفاق على إن الرقم ده يبقى حرف إيه.

- **Charset (مجموعة الحروف):** جدول بيقول كل حرف ليه رقم إيه. مثال: في Unicode حرف `A` رقمه 65.
- **Encoding (الترميز):** الطريقة اللي بنحوّل بيها الرقم ده لـ bytes ونخزنه.

**أشهر الأنواع:**

- **ASCII:** قديم، بيدعم الإنجليزي بس (128 حرف).
- **UTF-8:** ( Unicode Transformation Formate) الأشهر والمعتمد في الويب. حجمه متغير: الحرف الإنجليزي بـ **1 byte**، والعربي غالبًا بـ **2 bytes**، والإيموجي بـ **4 bytes**.

**ليه ده مهم في Node؟**
لما بتقري ملف من غير ما تقولي الـ encoding، Node مش عارفة تعتبره نص ولا بيانات خام، فبترجعلك Buffer. ولو قريتيه بـ encoding غلط، النص بيطلع **حروف مبوظة** (�����).

```js
// الأفضل دايمًا تحددي utf8 صراحةً
const text = await fs.readFile("./note.txt", "utf8");
```

**أنواع encoding تانية هتقابليها:** `hex` و `base64` (بيستخدموا في الـ tokens والصور والتشفير).

---

## 5. Buffers (ال bytes الخام - hexadecimal)

**التعريف:** الـ Buffer هو **مساحة ثابتة الحجم في الذاكرة** بتخزن بيانات خام (bytes). بنستخدمه لما نتعامل مع بيانات مش نصوص عادية: ملفات، صور، بيانات الشبكة.

```js
const buf = Buffer.from("Hello");
console.log(buf); // <Buffer 48 65 6c 6c 6f>
console.log(buf.toString()); // 'Hello'
console.log(buf.length); // 5

const ar = Buffer.from("مرحبا");
console.log(ar.length); // 10 (مش 5!)
```

**ليه `'مرحبا'` طولها 10؟** لأن `length` بيعد **الـ bytes** مش عدد الحروف، وكل حرف عربي بياخد 2 bytes في UTF-8. ده بيربط الـ Buffers بالكلام اللي فات عن الـ encoding.

**أهم حاجات:**

- `Buffer.from(...)` لعمل Buffer.
- `buf.toString('utf8' | 'hex' | 'base64')` لتحويله لنص.
- الـ Buffer بيتعامل معاه كأنه array من الأرقام (من 0 لـ 255).

## **ملاحظاتي من الفيديو:**

String
↓
Encoding
↓
Bytes
↓
Buffer (المكان)

---

## 6. Streams

**المشكلة:** لو عندك ملف حجمه 2GB وعملتي `readFile`، Node هتحمّله **كله في الرامات مرة واحدة**، والبرنامج ممكن يقع.

**الحل:** الـ Stream بيقرأ ويعالج الداتا **على أجزاء صغيرة (chunks)** من غير ما يحمّل الملف كله. زي الفرق بين إنك تحمّلي فيلم كامل قبل ما تشوفيه، وإنك تشوفيه Streaming وهو بيحمل.

**الأنواع الأربعة:**

| النوع         | الوظيفة                 | مثال                   |
| ------------- | ----------------------- | ---------------------- |
| **Readable**  | بنقرأ منه               | `fs.createReadStream`  |
| **Writable**  | بنكتب فيه               | `fs.createWriteStream` |
| **Duplex**    | قراءة وكتابة            | socket                 |
| **Transform** | بيعدّل الداتا وهي معدية | ضغط الملفات (zlib)     |

**مثال: نسخ ملف كبير:**

```js
import fs from "node:fs";
import { pipeline } from "node:stream/promises";

await pipeline(
  fs.createReadStream("./big-video.mp4"),
  fs.createWriteStream("./copy.mp4"),
);
console.log("تم النسخ");
```

**الأحداث الأساسية في الـ Readable:**

```js
const stream = fs.createReadStream("./big.txt", "utf8");

stream.on("data", (chunk) => console.log("وصل جزء:", chunk.length));
stream.on("end", () => console.log("خلصنا"));
stream.on("error", (err) => console.error(err));
```

**مفاهيم لازم تعرفيها:**

- **`pipe` / `pipeline`:** بتوصّل stream بـ stream. الأفضل `pipeline` لأنها بتتعامل مع الـ errors صح.
- **Backpressure:** لو الـ Writable أبطأ من الـ Readable، الداتا بتتراكم. الـ pipe بيتعامل مع ده تلقائيًا ويوقف القراءة لحد ما الكتابة تلحق.
- **`highWaterMark`:** حجم الـ chunk (الافتراضي 64KB في الملفات).

**القاعدة:** ملفات صغيرة تقدري تستخدمي `readFile`، لكن ملفات كبيرة أو بيانات جاية من الشبكة استخدمي Streams.

---

## 7. NPM

**التعريف:** NPM هو **مدير الحزم (Package Manager)** بتاع Node. بيخليكي تستخدمي مكتبات حد تاني كتبها، وبتنزلها بأمر واحد.

**أهم الأوامر:**

```bash
npm init -y                  # يعمل package.json
npm install express          # ينزل مكتبة ويضيفها في dependencies
npm install -D nodemon       # يضيفها في devDependencies
npm install -g <package>     # تنزيل global
npm uninstall <package>      # مسح مكتبة
npm run <script>             # تشغيل script من package.json
npx <package>                # تشغيل package من غير ما تنزليها
```

**الملفات المهمة:**

- **`package.json`:** بطاقة المشروع. فيها الاسم والإصدار والـ scripts والـ dependencies.
- **`package-lock.json`:** بيثبّت الإصدارات بالظبط عشان كل الناس تنزل نفس النسخ. **ارفعيه على GitHub.**
- **`node_modules/`:** فيها المكتبات المنزلة. **متترفعش على GitHub** (حطيها في `.gitignore`)، وأي حد ينزل المشروع بيعمل `npm install` ويرجعها.

**الفرق بين dependencies و devDependencies:**

- `dependencies`: المكتبات اللي المشروع محتاجها وهو شغال (express مثلًا).
- `devDependencies`: أدوات للتطوير بس (nodemon, jest, eslint).

**الـ Versioning (Semantic Versioning):** الإصدار شكله `MAJOR.MINOR.PATCH` زي `4.18.2`:

- `^4.18.2` يسمح بتحديثات MINOR و PATCH.
- `~4.18.2` يسمح بتحديثات PATCH بس.

```json
MAJOR.MINOR.PATCH

4 . 18 . 2
│ │ │
│ │ └─ Bug fixes
│ └────── New features
└────────── Breaking changes
```

**الـ Scripts:**

```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  }
}
```

بتشغليها بـ `npm start` أو `npm run dev`.

---

## 8. Create and Publish CLI Tool

**الفكرة:** بدل ما تشغلي الأداة بـ `node index.js`، تخليها أمر بيتكتب في أي مكان زي `mytool add "buy milk"`، وتنشريها على NPM عشان أي حد ينزلها.

**الخطوات:**

**1) السطر السحري في أول الملف (Shebang):**

```js
#!/usr/bin/env node
```

بيقول للنظام يشغل الملف ده بـ Node.

**2) حقل `bin` في `package.json`:**

```json
{
  "name": "my-unique-cli-name",
  "version": "1.0.0",
  "bin": {
    "mytool": "./index.js"
  }
}
```

اسم الأمر (`mytool`) هو اللي هيكتبه المستخدم في التيرمنال.

**3) جربيه محليًا قبل النشر:**

```bash
npm link
mytool --help
```

`npm link` بيعمل الأمر شغال على جهازك كأنه منزّل global.

**4) انشريه:**

```bash
npm login
npm publish
```

**نقط مهمة:**

- اسم الـ package لازم يكون **مش مستخدم** على NPM (ممكن تعملي scoped: `@username/tool`).
- لو عدّلتي ونشرتي تاني، لازم تغيري الـ version (`npm version patch`).
- تأكدي إنك مش بتنشري ملفات مش مطلوبة (استخدمي حقل `files` أو `.npmignore`).
- المكتبة بتاعة الأوامر (**commander**) هي اللي بتقرا `process.argv` وتنظمه ليكي.

## **ملاحظاتي من الفيديو:**

---

## حاجات مش فاهماها

-

## تطبيق من دماغي

- [ ] اعملي سكريبت بيقرا ملف كبير بـ stream ويعدّ عدد الأسطر.
- [ ] جربي `Buffer.from()` على كلمة عربي وإنجليزي وقارني الـ length.
- [ ] اعملي CLI صغير بـ commander واعمليله `npm link`.
