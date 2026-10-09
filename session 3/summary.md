# سيشن 3: libuv, Thread Pool, Event Loop و HTTP Server

## الخريطة العامة

| #   | الموضوع                                |
| --- | -------------------------------------- |
| 0   | الصورة الكبيرة: Node شغالة إزاي؟       |
| 1   | libuv                                  |
| 2   | Thread Pool                            |
| 3   | OS Kernel                              |
| 4   | Event Loop                             |
| 5   | Call Stack                             |
| 6   | Callback Queue                         |
| 7   | Call Stack و Callback Queue مع بعض     |
| 8   | Callback Phases (مراحل الـ Event Loop) |
| 9   | عمل HTTP Server                        |

---

## 0. الصورة الكبيرة

### المشكلة

JavaScript لغة **single-threaded**: عندها thread واحد بينفذ الكود. طيب إزاي Node تقدر تخدم آلاف المستخدمين في نفس الوقت، وتقرا ملفات وتكلم داتابيز، بـ thread واحد؟ لو كل عملية بطيئة وقفت الـ thread، السيرفر كله هيقف.

### الحل

الـ thread الواحد **مبيستناش**. أي عملية بطيئة (ملف، شبكة، تشفير) بيسلّمها لحد تاني يعملها (الـ OS أو thread pool)، ويكمل شغل. ولما العملية تخلص، بيتنفذ الـ callback بتاعها. اللي بينظم الكلام ده كله هو الـ **Event Loop**.

### مكونات Node

```
        كود الـ JavaScript بتاعك
                 │
          ┌──────▼──────┐
          │     V8      │   ← بينفذ الـ JS (فيه الـ Call Stack والـ Heap)
          └──────┬──────┘
                 │   (C++ bindings)
          ┌──────▼──────────────────┐
          │         libuv           │
          │  Event Loop + Thread Pool│
          └───────┬─────────┬───────┘
                  │         │
          ┌───────▼───┐ ┌───▼────────────┐
          │ OS Kernel │ │  Thread Pool   │
          │ (network) │ │ (fs, crypto..) │
          └───────────┘ └────────────────┘
```

**من الـ docs:** الـ event loop هو اللي بيخلي Node تعمل non-blocking I/O رغم إن في thread JavaScript واحد، عن طريق **تسليم العمليات للـ kernel** كل ما أمكن.

---

## 1. libuv

### الفكرة

**libuv** مكتبة مكتوبة بلغة **C**، هي اللي بتنفذ الـ **Event Loop** وكل السلوك الـ asynchronous في Node (الملفات، الشبكة، الـ timers...). مش جزء من JavaScript ولا من V8.

### المشكلة

كل نظام تشغيل بيتعامل مع الـ async I/O بطريقة مختلفة:

| النظام  | الآلية   |
| ------- | -------- |
| Linux   | `epoll`  |
| macOS   | `kqueue` |
| Windows | `IOCP`   |

لو Node اعتمدت على كل واحدة لوحدها، كانت هتحتاج كود مختلف لكل نظام.

### الحل

**libuv بتوحّد كل ده في واجهة واحدة.** Node بتكلم libuv، وlibuv هي اللي بتتعامل مع النظام الفعلي. عشان كده نفس كود Node بيشتغل على Windows وMac وLinux من غير تعديل.

### libuv بتقدم إيه؟

- الـ **Event Loop**.
- الـ **Thread Pool** (للعمليات اللي مفيش لها non-blocking في النظام).
- التعامل مع الـ network sockets، والـ timers، والـ file system، والـ child processes.

### ملاحظة

مفيش علاقة بين libuv والـ V8: الـ V8 بيفهم JavaScript بس، وlibuv هي اللي بتعمل الـ async.

---

## 2. Thread Pool

### الفكرة

مجموعة **threads (عمال) جاهزين** بتشتغل في الخلفية، بتنفذ المهام التقيلة بعيدًا عن الـ thread الرئيسي. بتتسمى كمان **Worker Pool**، وهي جزء من libuv.

### المشكلة

فيه عمليات النظام **مبيوفرش ليها non-blocking حقيقي**، أو عمليات **CPU-intensive** (حسابات تقيلة). لو اتنفذت على الـ thread الرئيسي، هتوقف السيرفر كله.

### الحل

Node بتبعت المهام دي للـ Thread Pool، وبتكمل الـ main thread شغل تاني. لما المهمة تخلص، الـ worker بيبلغ الـ Event Loop، وبيتنفذ الـ callback.

### إيه اللي بيستخدم الـ Thread Pool؟ (من الـ docs)

| النوع           | الـ APIs                                                                                |
| --------------- | --------------------------------------------------------------------------------------- |
| **File System** | كل دوال `fs` ما عدا `fs.FSWatcher()` والدوال الـ Sync                                   |
| **DNS**         | `dns.lookup()` و `dns.lookupService()`                                                  |
| **Crypto**      | `crypto.pbkdf2()` و `scrypt()` و `randomBytes()` و `randomFill()` و `generateKeyPair()` |
| **Zlib**        | كل دوال الضغط ما عدا الـ Sync                                                           |

> **مهم:** الـ **network I/O** (زي الـ HTTP) **مبيستخدمش** الـ Thread Pool، بيتسلم للـ OS Kernel مباشرة (القسم الجاي).

### الحجم

الـ Thread Pool الافتراضي فيه **4 threads**. تقدري تغيريه بمتغير البيئة `UV_THREADPOOL_SIZE` (لحد 1024).

**على Windows PowerShell:**

```powershell
$env:UV_THREADPOOL_SIZE = 8; node app.js
```

**على CMD:**

```bat
set UV_THREADPOOL_SIZE=8 && node app.js
```

**على Mac/Linux:**

```bash
UV_THREADPOOL_SIZE=8 node app.js
```

### تجربة تشوفي بيها الـ Thread Pool بعينك

```js
import crypto from "node:crypto";

const start = Date.now();

for (let i = 1; i <= 5; i++) {
  crypto.pbkdf2("password", "salt", 500000, 64, "sha512", () => {
    console.log(`Task ${i} finished after ${Date.now() - start}ms`);
  });
}
```

**المتوقع:** أول **4 مهام** بتخلص في نفس الوقت تقريبًا (لأن الـ pool فيه 4 threads، ولو جهازك فيه 4 cores أو أكتر)، والمهمة الخامسة **بتستنى** لحد ما thread يفضى فتخلص بعدهم. جربي تغيري `UV_THREADPOOL_SIZE` وشوفي الفرق.

### حاجة لازم تاخدي بالك منها (من الـ docs)

الـ Worker Pool عدد عماله محدود. لو مهمة واحدة طويلة جدًا، **بتشغل worker كامل** وبتقلل حجم الـ pool فعليًا. وحتى حاجة بسيطة زي قراءة ملف كبير ممكن تأثر. الحل: استخدمي **Streams** (اللي اتعلمناها في سيشن 2) بدل `readFile` للملفات الكبيرة، لأن الـ stream بيقسم الشغل على أجزاء.

### Thread Pool مش هو Worker Threads

`worker_threads` module حاجة تانية: بتخليكي **إنتي** تعملي threads بتنفذ كود JavaScript بتاعك (للحسابات التقيلة). مش موضوع السيشن دي.

## **ملاحظاتي من الفيديو:**

دوال الـ Callback بتتنفذ دائماً على (Main Thread)، وتحديداً من خلال (Callback Queue / Task Queue) الذي يُديره الـ Event Loop.

---

## 3. OS Kernel

### الفكرة

**الـ Kernel** هو قلب نظام التشغيل، وهو اللي بيتعامل فعليًا مع الهاردوير (الشبكة، الهارد، الذاكرة).

### المشكلة

لو Node عملت thread لكل connection جاي (زي ما بتعمل سيرفرات قديمة)، 10 آلاف مستخدم = 10 آلاف thread، وده يستهلك ذاكرة هائلة ووقت في التبديل بينهم.

### الحل

الـ kernel الحديث **مبني أصلًا إنه multi-threaded ويقدر يراقب آلاف الـ connections مرة واحدة**. فـ Node بتقوله: "راقبلي الـ sockets دي، وقولي لما حاجة تحصل". ولما connection جديد أو داتا توصل، الـ kernel بيبلغ Node، فبتتحط الـ callback المناسبة في الـ **poll queue** عشان تتنفذ.

(من الـ docs: الـ Event Loop مش بيحتفظ بـ queue بالمعنى الحرفي للشبكة، بل بمجموعة من الـ file descriptors بيطلب من الـ OS يراقبها بـ `epoll` أو `kqueue` أو `IOCP`.)

### مقارنة بسيطة

| السيرفرات التقليدية (زي Apache)      | Node.js                                 |
| ------------------------------------ | --------------------------------------- |
| thread لكل عميل                      | thread واحد لكل العملاء + kernel بيراقب |
| لو thread وقف، الـ OS بيدّي غيره دور | لو الـ main thread وقف، **الكل** بيستنى |
| استهلاك ذاكرة أعلى مع الزيادة        | بيتحمل connections كتير بموارد أقل      |

---

## 4. Event Loop

### الفكرة

حلقة بتلف **باستمرار** طول ما البرنامج شغال، ومهمتها: تشوف في callbacks جاهزة للتنفيذ فتنفذها، وتستنى النتائج من الـ kernel والـ thread pool.

### المشكلة

مين اللي يقرر إمتى ينفذ الـ callback اللي رجع من عملية بتتنفذ في الخلفية؟ ومينفعش يتنفذ في أي وقت، لأن ده هيقطع كود شغال.

### الحل

الـ Event Loop بيستنى لحد ما **الـ Call Stack يفضى**، وبعدين بياخد callback جاهز وينفذه، وبيكرر.

### إزاي بتشتغل (من الـ docs)

1. لما Node تشتغل، بتبدأ الـ event loop وبتنفذ الملف الأساسي بتاعك (ممكن يعمل async calls أو يجدول timers).
2. بعدين تبدأ تدور الـ loop على **مراحل (phases)**، وكل مرحلة ليها queue خاصة بيها.
3. **بين كل لفة والتانية**، Node بتشوف: هل لسه في عمليات I/O أو timers مستنية؟ لو لأ، **البرنامج بيقفل لوحده**.

النقطة الأخيرة دي مهمة: عشان كده السيرفر اللي بتعمليه **مبيقفلش** لوحده، لأن الـ listening socket لسه مستني اتصالات.

### مثال بيوضح الترتيب

```js
console.log("1: start");

setTimeout(() => console.log("3: timeout"), 0);

console.log("2: end");
```

الناتج: `1` ثم `2` ثم `3`. الـ `setTimeout` بـ 0 مش بينفذ فورًا، لأنه بيحط الـ callback في الطابور، والـ event loop مش هيمسكه إلا لما الكود الحالي يخلص.

### الـ Timer هو حد أدنى مش وقت مضمون (من الـ docs)

الـ `setTimeout(fn, 100)` معناها "نفّذ **بعد 100ms على الأقل**"، مش "بالظبط عند 100ms". لو الـ loop مشغول بحاجة تانية، التنفيذ هيتأخر.

## **ملاحظاتي من الفيديو:**

---

## 5. Call Stack

### الفكرة

**الـ Call Stack** (مكدس الاستدعاءات) هو مكان في V8 بيتتبع **الدالة اللي بتتنفذ دلوقتي** واللي نادت عليها. شغال بمبدأ **LIFO** (آخر واحدة دخلت أول واحدة تطلع)، وبينفذ **حاجة واحدة بس في الوقت**.

### مثال

```js
function third() {
  console.log("third");
}
function second() {
  third();
}
function first() {
  second();
}

first();
```

الـ stack بيتحرك كده:

```
1) first()               [first]
2) first → second()      [first, second]
3) ... → third()         [first, second, third]
4) third تخلص وتطلع      [first, second]
5) second تخلص وتطلع     [first]
6) first تخلص وتطلع      []   ← فاضي
```

### المشكلة 1: Stack Overflow

لو دالة نادت على نفسها بلا نهاية، الـ stack بيتملي:

```js
function boom() {
  boom();
}
boom(); // RangeError: Maximum call stack size exceeded
```

### المشكلة 2: الـ Blocking

طالما الـ stack مشغول بدالة طويلة، **مفيش حاجة تانية تتنفذ**، حتى لو callbacks جاهزة في الطابور.

```js
setTimeout(() => console.log("timer"), 0);

const start = Date.now();
while (Date.now() - start < 3000) {} // بيشغل الـ stack 3 ثواني

console.log("done");
```

الـ timer مجهز من الأول، بس مش هيتنفذ إلا بعد `done`، لأن الـ stack مشغول بالـ loop.

### الحل

- خلي كل callback **قصير وسريع**.
- استخدمي العمليات الـ **async** بدل الـ sync.
- الحسابات التقيلة تتقسّم أو تتنقل لـ worker (من الـ docs: الـ Event Loop يفترض ينسّق الطلبات مش ينفذ الشغل التقيل بنفسه).

## **ملاحظاتي من الفيديو:**

---

## 6. Callback Queue

### الفكرة

**الـ Callback Queue** هو طابور (**FIFO**: الأول يدخل الأول يخرج) بيستنى فيه الـ callbacks الجاهزة للتنفيذ، لحد ما الـ Call Stack يفضى.

### المشكلة

لما عملية async تخلص (قراءة ملف خلصت، timer انتهى)، الـ callback بتاعها **مينفعش يتنفذ فورًا**، لأن ممكن الـ stack يكون في نص دالة تانية.

### الحل

الـ callback بيتحط في الطابور ويستنى دوره، والـ Event Loop بيشيله وينفذه **لما الـ stack يفضى**.

### تنبيه مهم: مفيش طابور واحد!

كلمة "Callback Queue" تبسيط بنستخدمه في الشرح. الحقيقة (من الـ docs):

- **كل مرحلة** من مراحل الـ Event Loop ليها **queue خاصة بيها** (timers queue، poll queue، check queue...).
- فيه كمان طوابير بتتنفذ **قبل** ما الـ loop يكمل: **`process.nextTick` queue** و **الـ Promises (microtasks)**.

يعني الأدق: هي **مجموعة طوابير**، وفي ترتيب بينها (هنشوفه في القسم 8).

## **ملاحظاتي من الفيديو:**

---

## 7. Call Stack و Callback Queue مع بعض

### الفكرة

دول الاتنين مع الـ Event Loop بيكوّنوا الدورة الكاملة لتنفيذ الكود.

### الدورة خطوة بخطوة

```
1. الكود بيتنفذ في الـ Call Stack
2. لما نلاقي عملية async (setTimeout, fs.readFile, ...):
      Node بتسلمها للـ Kernel أو الـ Thread Pool وتكمل
3. لما العملية تخلص → الـ callback بتاعها بيتحط في الطابور
4. الـ Event Loop بيسأل: "الـ Call Stack فاضي؟"
      لأ  → استنى
      آه → خد callback من الطابور وحطه في الـ Stack ونفذه
5. كرر
```

### مثال شامل

```js
import fs from "node:fs";

console.log("A");

setTimeout(() => console.log("B: timeout"), 0);

fs.readFile(import.meta.filename, () => console.log("C: file read"));

console.log("D");
```

**اتبعي الخطوات:**

1. `A` تتطبع (الـ stack).
2. `setTimeout` بتتسجل، وكمان `readFile` بتتبعت للـ Thread Pool.
3. `D` تتطبع، والـ stack يفضى.
4. الـ Event Loop يبدأ ينفذ الـ callbacks الجاهزة.

الناتج: `A` ثم `D` ثم الباقي (الترتيب بين B وC بيعتمد على التوقيت ومراحل الـ loop).

### المهم تفهميه

**ترتيب الكتابة في الكود ≠ ترتيب التنفيذ.** أي حاجة async بتتأجل لحد ما الكود المتزامن (sync) كله يخلص.

## **ملاحظاتي من الفيديو:**

---

## 8. Callback Phases (مراحل الـ Event Loop)

### الفكرة

الـ Event Loop مش طابور واحد، هو **دورة من 6 مراحل**، كل مرحلة بتنفذ نوع معين من الـ callbacks. (من الـ docs)

```
   ┌───────────────────────────┐
   │          timers           │  setTimeout / setInterval
   └─────────────┬─────────────┘
   ┌─────────────▼─────────────┐
┌─>│     pending callbacks     │  أخطاء I/O مؤجلة من اللفة اللي فاتت
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
│  │       idle, prepare       │  داخلي بس
│  └─────────────┬─────────────┘      ┌───────────────┐
│  ┌─────────────▼─────────────┐      │   incoming:   │
│  │           poll            │<─────┤  connections, │
│  └─────────────┬─────────────┘      │   data, etc.  │
│  ┌─────────────▼─────────────┐      └───────────────┘
│  │           check           │  setImmediate
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
│  │     close callbacks       │  socket.on('close')
│  └─────────────┬─────────────┘
└────────────────┘
```

### كل مرحلة بتعمل إيه؟

| المرحلة               | بتنفذ إيه                                                                                                         |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **timers**            | callbacks بتاعة `setTimeout` و `setInterval` اللي وقتها جه                                                        |
| **pending callbacks** | callbacks بعض عمليات النظام المؤجلة، زي بعض أخطاء الـ TCP (مثلًا `ECONNREFUSED`)                                  |
| **idle, prepare**     | استخدام داخلي بس                                                                                                  |
| **poll**              | **أهم مرحلة**: بتجيب أحداث الـ I/O الجديدة وتنفذ callbacks بتاعتها (ملفات، شبكة)، وممكن **تستنى هنا** لو مفيش شغل |
| **check**             | callbacks بتاعة `setImmediate`                                                                                    |
| **close callbacks**   | أحداث الإغلاق، زي `socket.on('close')`                                                                            |

### إزاي كل مرحلة بتشتغل؟

لما الـ loop يدخل مرحلة، بينفذ callbacks الـ queue بتاعتها لحد ما:

- الـ queue تفضى، **أو**
- يوصل لحد أقصى من عدد الـ callbacks،

وبعدين ينتقل للمرحلة اللي بعدها.

### مرحلة الـ Poll بالتفصيل

- لو الـ poll queue **فيها callbacks**: ينفذها واحدة واحدة.
- لو **فاضية**:
  - لو في `setImmediate` متجدولة: يطلع على مرحلة **check**.
  - لو لأ: **يستنى** callbacks جديدة توصل (وده الوضع الطبيعي للسيرفر وهو مستني طلبات).
- ولو في timer جه ميعاده، بيرجع لمرحلة timers.

### تحديث في Node 20+

من libuv 1.45.0 (Node 20) الـ timers بتتنفذ **بعد** مرحلة الـ poll في كل لفة، وكانت قبلها في النسخ الأقدم. وده ممكن يأثر على الترتيب بين `setTimeout` و `setImmediate`.

### `setTimeout(0)` ضد `setImmediate`

```js
setTimeout(() => console.log("timeout"), 0);
setImmediate(() => console.log("immediate"));
```

لو الكود ده في الملف الرئيسي، **الترتيب مش مضمون**، ممكن يطلع أي واحد الأول (بيعتمد على أداء العملية). لكن **جوه callback بتاع I/O**، الـ `immediate` بيتنفذ **دايمًا الأول**:

```js
import fs from "node:fs";

fs.readFile(import.meta.filename, () => {
  setTimeout(() => console.log("timeout"), 0);
  setImmediate(() => console.log("immediate"));
});
// الناتج دايمًا: immediate ثم timeout
```

**ليه؟** لأننا في مرحلة poll، والمرحلة اللي بعدها مباشرة هي check (اللي فيها setImmediate)، والـ timers محتاجة تلف اللفة كلها.

### `process.nextTick()` والـ Promises: برّه المراحل!

الـ `process.nextTick` **مش جزء من الـ Event Loop** تقنيًا (من الـ docs). الـ nextTick queue بتتنفذ **بعد العملية الحالية مباشرة** وقبل ما الـ loop يكمل لأي مرحلة، أيًا كانت. وكذلك الـ **Promise callbacks (microtasks)**.

**ترتيب الأولوية (من الأعلى):**

```
1. الكود المتزامن (الـ Call Stack)
2. process.nextTick queue
3. Promises (microtasks)
4. مراحل الـ Event Loop (timers → poll → check ...)
```

```js
console.log("1: sync");

setTimeout(() => console.log("5: timeout"), 0);
setImmediate(() => console.log("6: immediate"));
Promise.resolve().then(() => console.log("4: promise"));
process.nextTick(() => console.log("3: nextTick"));

console.log("2: sync");
```

> **جربيه بنفسك:** في CommonJS، الـ nextTick بيسبق الـ promise. وفي ES Modules (اللي بتستخدميها) ممكن الترتيب بين nextTick والـ promise يختلف عن الأرقام اللي فوق، لأن الملف نفسه بيتنفذ جوه promise. شغليه وشوفي الناتج الفعلي.

### الفرق بين `nextTick` و `setImmediate` (من الـ docs)

- `process.nextTick()` بيتنفذ **فورًا في نفس المرحلة**.
- `setImmediate()` بيتنفذ في **اللفة الجاية** (مرحلة check).

الأسماء مقلوبة تاريخيًا (المفروض الأول يتسمى immediate)، لكن مش هتتغير عشان تكسير آلاف الـ packages. والـ docs بتنصح باستخدام `setImmediate()` في أغلب الحالات لأنه أسهل في الفهم.

### خطر الـ nextTick: تجويع الـ I/O

لو عملتي `process.nextTick` recursive (كل callback بيعمل nextTick تاني)، الـ loop **مش هيوصل لمرحلة poll أبدًا**، فالـ I/O بيتجوّع ومفيش حاجة تتنفذ:

```js
function starve() {
  process.nextTick(starve); // ⚠️ الـ loop مش هيتحرك!
}
```

### ليه nextTick موجودة أصلًا؟ (من الـ docs)

عشان تخلي الـ API **async دايمًا** حتى لو مش لازم، فتدي المستخدم فرصة يكمل كوده الأول (مثلًا يسجل `.on('listening')`) قبل ما الحدث يتبعت.

## **ملاحظاتي من الفيديو:**

---

## 9. عمل HTTP Server

### الفكرة

Node فيها module جاهز اسمه **`http`** بيخليكي تعملي سيرفر يستقبل طلبات HTTP ويرد عليها، من غير أي مكتبات.

### أبسط سيرفر

```js
import http from "node:http";

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Hello from Node!");
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
```

شغليه بـ `node server.js` وافتحي `http://localhost:3000` في المتصفح.

### شرح كل جزء

| الجزء                         | معناه                                                      |
| ----------------------------- | ---------------------------------------------------------- |
| `http.createServer(callback)` | بيعمل السيرفر. الـ callback بيتنفذ **مع كل طلب** جاي       |
| `req`                         | بيانات الطلب: `req.url`, `req.method`, `req.headers`       |
| `res`                         | الأداة اللي بترد بيها على العميل                           |
| `res.statusCode`              | رقم حالة الرد (200, 404, 500...)                           |
| `res.setHeader(name, value)`  | تحديد header للرد                                          |
| `res.end(data)`               | **إنهاء الرد وإرساله**. من غيرها العميل هيفضل مستني للأبد! |
| `server.listen(port, cb)`     | بيخلي السيرفر يبدأ يستقبل على البورت                       |

### `req` و `res` هما Streams!

(ده بيربط بسيشن 2)

- `req` هو **Readable stream** (بنقرا منه جسم الطلب).
- `res` هو **Writable stream** (بنكتب فيه الرد، وتقدري تعملي `pipe` لملف للـ response).

```js
import fs from "node:fs";
// إرسال ملف كبير كـ stream بدل ما نحمله كله في الذاكرة
fs.createReadStream("./big-file.txt").pipe(res);
```

### إزاي السيرفر بيتعامل مع الـ Event Loop؟

```
1. server.listen() → Node بتسلم الـ socket للـ OS Kernel
2. طلب جديد يوصل → الـ Kernel يبلّغ
3. الـ callback بتاعك بيتحط في الـ poll queue
4. الـ Event Loop ينفذه (على الـ Call Stack)
5. res.end() → الرد يتبعت
6. السيرفر يفضل مستني → عشان كده البرنامج مبيقفلش لوحده
```

### Routing بسيط

```js
import http from "node:http";

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("الصفحة الرئيسية");
  } else if (req.method === "GET" && req.url === "/api/hello") {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ message: "Hello", time: new Date() }));
  } else {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not Found");
  }
});

server.listen(3000);
```

ده بالظبط اللي **Express** هيسهّله عليكي بعدين (الـ routing والـ middleware).

### أخطاء شائعة هتقابليها

**1) `EADDRINUSE`:** البورت مستخدم من برنامج تاني (غالبًا السيرفر القديم لسه شغال). اقفلي التيرمنال القديم (`Ctrl+C`) أو غيري البورت.

**2) أي تعديل في الكود محتاج restart:** السيرفر بيحمل الكود مرة واحدة. استخدمي:

```bash
node --watch server.js
```

عشان يعيد التشغيل لوحده عند أي تعديل.

**3) الـ callback بيتنفذ مرتين من المتصفح:** المتصفح بيطلب كمان `/favicon.ico` تلقائيًا. جربي `console.log(req.url)` جوه الـ callback وهتشوفي.

**4) نسيان `res.end()`:** الطلب هيفضل معلق ومفيش رد.

### 🔥 تجربة تربط كل السيشن ببعض: ازاي Blocking بيوقع السيرفر

```js
import http from "node:http";

const server = http.createServer((req, res) => {
  if (req.url === "/block") {
    // ⚠️ بيشغل الـ Call Stack 5 ثواني
    const start = Date.now();
    while (Date.now() - start < 5000) {}
    res.end("blocked for 5 seconds");
  } else {
    res.end("fast response");
  }
});

server.listen(3000);
```

**جربي:**

1. افتحي تبويب على `http://localhost:3000/block` (هيستنى 5 ثواني).
2. **فورًا** افتحي تبويب تاني على `http://localhost:3000/`.

هتلاقي الصفحة **السريعة كمان مستنية**، رغم إنها بسيطة! ده بالظبط معنى "أي callback طويل بيوقف **كل** العملاء" (من docs: _Don't Block the Event Loop_).

الحل الصح للشغل التقيل: عمليات **async**، أو **streams**، أو نقل الحسابات لـ worker.

## **ملاحظاتي من الفيديو:**

---

## الخلاصة: الجدول الكبير

| المفهوم                 | هو إيه؟                                    | بيحل إيه؟                                                   |
| ----------------------- | ------------------------------------------ | ----------------------------------------------------------- |
| **libuv**               | مكتبة C بتنفذ الـ Event Loop والـ async    | اختلاف أنظمة التشغيل                                        |
| **Thread Pool**         | 4 threads (افتراضيًا) بتنفذ المهام التقيلة | عمليات مفيش لها non-blocking (fs, crypto, zlib, dns.lookup) |
| **OS Kernel**           | بيراقب الـ network sockets                 | خدمة آلاف الـ connections من غير thread لكل واحد            |
| **Event Loop**          | حلقة بتلف وتنفذ الـ callbacks الجاهزة      | تنسيق الـ async بـ thread واحد                              |
| **Call Stack**          | مكان تنفيذ الدوال (LIFO)                   | تتبع الدالة الحالية                                         |
| **Callback Queue**      | طابور الـ callbacks المنتظرة (FIFO)        | تأجيل الـ callbacks لحد ما الـ stack يفضى                   |
| **Phases**              | 6 مراحل في كل لفة                          | ترتيب منظم لأنواع الـ callbacks                             |
| **nextTick / Promises** | طوابير بتتنفذ قبل مراحل الـ loop           | تنفيذ فوري بعد العملية الحالية                              |
| **HTTP Server**         | `http.createServer`                        | استقبال الطلبات والرد                                       |

### القاعدة الذهبية (من الـ docs)

> Node سريعة لما الشغل المرتبط بكل عميل في أي لحظة **صغير**.

يعني: **متشغليش الـ Event Loop ولا الـ Thread Pool بحاجة طويلة.**

---

## حاجات مش فاهماها

-

## تطبيق من دماغي

- [ ] شغلي تجربة `pbkdf2` وغيري `UV_THREADPOOL_SIZE` (مثلًا 1 و4 و8) وسجلي النتايج.
- [ ] شغلي مثال ترتيب `nextTick` / `Promise` / `setTimeout` / `setImmediate` وسجلي الناتج الفعلي عندك.
- [ ] اعملي HTTP server فيه 3 routes (`/`, `/api/hello`, و 404) وجربيه بالمتصفح.
- [ ] اعملي route فيه `while` loop واتأكدي إنه بيوقف باقي الـ routes، وبعدين غيريه لحاجة async وشوفي الفرق.
- [ ] ابعتي ملف كبير من الـ server بـ `createReadStream().pipe(res)`.

---

## المصادر (الـ Documentation)

- [The Node.js Event Loop, Timers, and process.nextTick()](https://nodejs.org/learn/asynchronous-work/event-loop-timers-and-nexttick)
- [Don't Block the Event Loop (or the Worker Pool)](https://nodejs.org/learn/asynchronous-work/dont-block-the-event-loop)
- [Overview of Blocking vs Non-Blocking](https://nodejs.org/learn/asynchronous-work/overview-of-blocking-vs-non-blocking)
- [Understanding process.nextTick()](https://nodejs.org/learn/asynchronous-work/understanding-processnexttick)
- [Understanding setImmediate()](https://nodejs.org/learn/asynchronous-work/understanding-setimmediate)
- [Anatomy of an HTTP Transaction](https://nodejs.org/learn/http/anatomy-of-an-http-transaction)
- [Node.js `http` API reference](https://nodejs.org/api/http.html)
- [libuv thread pool docs](https://docs.libuv.org/en/v1.x/threadpool.html)
