# سيشن 4: Express.js (Introduction, Routing, Middlewares)

## الخريطة العامة

| #   | الموضوع                                 |
| --- | --------------------------------------- |
| 1   | Express Introduction                    |
| 2   | Routing                                 |
| 3   | Middlewares                             |
| 4   | الصورة الكاملة: مشروع صغير يجمع كل حاجة |

---

## 1. Express Introduction

### الفكرة

**Express** هو **web framework** خفيف لـ Node.js بيسهّل بناء السيرفرات والـ APIs. هو مش لغة ولا بديل لـ Node، هو **مكتبة بتتبني فوق module الـ `http`** اللي استخدمناه في سيشن 3.

من الـ docs: Express هو framework للـ routing والـ middleware بوظائف قليلة جدًا بنفسه، والتطبيق في الأساس عبارة عن **سلسلة من دوال الـ middleware** بتتنفذ أثناء دورة (طلب ← رد).

### المشكلة: السيرفر الخام بـ `http` متعب

في سيشن 3 عملنا سيرفر بـ `http.createServer`. لما المشروع يكبر بتظهر مشاكل:

**1) الـ Routing بـ `if/else` طويلة:**

```js
const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/users") { ... }
  else if (req.method === "POST" && req.url === "/users") { ... }
  else if (req.method === "GET" && req.url.startsWith("/users/")) { /* استخراج الـ id بإيدك */ }
  else { /* 404 */ }
});
```

**2) قراءة الـ body بإيدك (Streams + events):**

```js
let body = "";
req.on("data", (chunk) => (body += chunk));
req.on("end", () => {
  const data = JSON.parse(body); // وكمان لو الـ JSON بايظ؟ try/catch...
  ...
});
```

**3) كل رد محتاج تضبطي الـ headers والـ status والـ JSON بإيدك:**

```js
res.statusCode = 200;
res.setHeader("Content-Type", "application/json");
res.end(JSON.stringify(data));
```

**4) مفيش طريقة منظمة** لتكرار منطق مشترك (تسجيل الطلبات، التحقق من الهوية...) على كل الـ routes.

### الحل: Express

نفس الشغل بس بشكل أبسط وأنضف:

```js
import express from "express";

const app = express();
app.use(express.json()); // قراءة الـ body تلقائيًا

app.get("/users", (req, res) => {
  res.json([{ id: 1, name: "Sara" }]); // status 200 + header + JSON في سطر
});

app.post("/users", (req, res) => {
  console.log(req.body); // الـ body جاهز
  res.status(201).json(req.body);
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
```

### الإعداد من الصفر

```bash
mkdir my-express-app && cd my-express-app
npm init -y
npm install express
```

في `package.json` أضيفي:

```json
{ "type": "module" }
```

عشان تستخدمي `import` بدل `require`. ولتشغيل السيرفر مع إعادة تشغيل تلقائي عند أي تعديل:

```bash
node --watch index.js
```

(تقدري تضيفيه كـ script: `"dev": "node --watch index.js"` وتشغليه بـ `npm run dev`.)

### Hello World

```js
import express from "express";

const app = express();
const PORT = 3000;

app.get("/", (req, res) => {
  res.send("Hello Express!");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
```

### إيه اللي بيحصل ورا الستار؟

- `express()` بترجع كائن اسمه `app`، وهو في الحقيقة **دالة `(req, res)`** تقدري تديها لـ `http.createServer`.
- `app.listen(3000)` هي اختصار لـ `http.createServer(app).listen(3000)`.
- كل طلب جاي = **Macrotask** في الـ Event Loop (زي ما اتعلمنا في سيشن 3)، والـ `app` بيمرره على سلسلة الـ middleware والـ routes.

### Express بيزوّد إيه على `req` و `res`؟

| الكائن    | الإضافات المفيدة                                                                                                                                   |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`req`** | `req.params` (متغيرات من الـ URL)، `req.query` (الـ query string)، `req.body` (جسم الطلب، بعد الـ parsing)، `req.get("header")`، `req.originalUrl` |
| **`res`** | `res.send()`، `res.json()`، `res.status()`، `res.redirect()`، `res.sendFile()`، `res.download()`                                                   |

### ⚠️ ملاحظات على Express 5

- `req.body` بيكون **`undefined`** لو مفيش middleware بيقراه (هنشوفها في قسم الـ Middlewares).
- بيتعامل مع الـ **async errors** تلقائيًا (هنشوفها في قسم الـ Error Handling).
- بيستخدم **path-to-regexp v8** في الـ routing، وده غير بعض الصيغ القديمة (هنشوفها في قسم الـ Routing).

---

## 2. Routing

### الفكرة

**الـ Routing** = تحديد **إزاي التطبيق يرد** على طلب جاي لـ **مسار (URL)** معين بـ **HTTP method** معينة. (من الـ docs: الـ routing بيحدد إزاي endpoints التطبيق بترد على طلبات العميل.)

### الشكل الأساسي

```js
app.METHOD(PATH, HANDLER);
```

| الجزء     | معناه                                                                 |
| --------- | --------------------------------------------------------------------- |
| `app`     | كائن Express                                                          |
| `METHOD`  | الـ HTTP method بحروف صغيرة (`get`, `post`, `put`, `patch`, `delete`) |
| `PATH`    | المسار على السيرفر                                                    |
| `HANDLER` | الدالة اللي بتتنفذ لما الطلب يطابق                                    |

### المشكلة اللي بيحلها

بدل `if/else` طويلة وتحليل الـ URL بإيدك، بتعرّفي كل route لوحده وExpress بيختار المناسب.

### الـ HTTP Methods وعلاقتها بالـ CRUD

| العملية                   | الـ Method | مثال              | الـ Status المناسب |
| ------------------------- | ---------- | ----------------- | ------------------ |
| **R**ead (قراءة)          | `GET`      | `GET /todos`      | 200                |
| **C**reate (إنشاء)        | `POST`     | `POST /todos`     | 201                |
| **U**pdate (استبدال كامل) | `PUT`      | `PUT /todos/5`    | 200                |
| **U**pdate (تعديل جزئي)   | `PATCH`    | `PATCH /todos/5`  | 200                |
| **D**elete (مسح)          | `DELETE`   | `DELETE /todos/5` | 204 (من غير body)  |

```js
app.get("/", (req, res) => res.send("GET request to the homepage"));
app.post("/", (req, res) => res.send("POST request to the homepage"));
```

### Route Paths (المسارات)

**String paths:** بتطابق المسار **بالظبط**. النقطة `.` والشرطة `-` بيتعاملوا كحروف عادية.

```js
app.get("/", (req, res) => res.send("root"));
app.get("/about", (req, res) => res.send("about"));
app.get("/random.text", (req, res) => res.send("random.text"));
```

> **ملاحظة من الـ docs:** الـ query string **مش** جزء من الـ route path. يعني `/about?x=1` بيطابق route `/about`.

**Regular Expressions:** للمطابقات المعقدة:

```js
app.get(/a/, (req, res) => res.send("أي مسار فيه حرف a"));
app.get(/.*fly$/, (req, res) => res.send("butterfly, dragonfly..."));
```

### Route Parameters (`req.params`)

**الفكرة:** أجزاء متغيرة في الـ URL، بتتعرّف بـ `:` قبل الاسم، والقيم بتتحط في `req.params`.

```js
// Route path: /users/:userId/books/:bookId
// Request URL: /users/34/books/8989
// req.params: { userId: "34", bookId: "8989" }

app.get("/users/:userId/books/:bookId", (req, res) => {
  res.send(req.params);
});
```

> **انتبهي:** القيم في `req.params` دايمًا **نصوص (strings)**. لو عايزة رقم: `Number(req.params.id)`.

**الشرطة والنقطة بيشتغلوا مع الـ params:**

```js
// /flights/:from-:to   →  /flights/LAX-SFO  →  { from: "LAX", to: "SFO" }
```

### الـ Query String (`req.query`)

بتيجي بعد علامة `؟` في الـ URL، وبتستخدم للفلترة والبحث والترتيب:

```js
// GET /products?category=books&sort=price
app.get("/products", (req, res) => {
  console.log(req.query); // { category: "books", sort: "price" }
  res.json(req.query);
});
```

### الفرق بين `params` و `query` و `body`

|                  | بتيجي منين؟                | مثال                    | بتستخدم في                |
| ---------------- | -------------------------- | ----------------------- | ------------------------- |
| **`req.params`** | جزء من المسار نفسه         | `/users/5` → `id = "5"` | تحديد **مورد معين**       |
| **`req.query`**  | بعد `؟` في الـ URL         | `/users?role=admin`     | **فلترة وبحث وترتيب**     |
| **`req.body`**   | جسم الطلب (POST/PUT/PATCH) | `{ "name": "Sara" }`    | **بيانات** إنشاء أو تعديل |

### ⚠️ تغييرات Express 5 في الـ Paths (مهم جدًا لو بتتفرجي على فيديوهات قديمة)

من الـ docs: Express 5 بيستخدم **path-to-regexp v8**، والصيغ دي اتغيرت:

**1) الـ Wildcard لازم يكون ليه اسم:**

```js
// ❌ Express 4 (هيطلع error في Express 5)
app.get("*", handler);

// ✅ Express 5
app.get("/*splat", handler);
```

والقيمة بتترجع كـ **array** من أجزاء المسار:

```js
app.get("/files/*filepath", (req, res) => {
  // GET /files/images/logo.png
  console.log(req.params.filepath); // [ "images", "logo.png" ]
  res.send(`File: ${req.params.filepath.join("/")}`);
});
```

ولو عايزة الـ wildcard يطابق كمان الـ root `/`:

```js
app.get("/{*splat}", (req, res) => res.send("ok"));
```

**2) الـ Optional segments بتستخدم أقواس `{}`:**

```js
// ❌ Express 4: /user/:id?
// ✅ Express 5:
app.get("/order{/:id}", (req, res) => {
  // GET /order/42 → { id: "42" }
  // GET /order    → {}
  res.send("ok");
});

app.get("/:file{.:ext}", (req, res) => {
  // GET /image.png → { file: "image", ext: "png" }
  // GET /image     → { file: "image" }
  res.send("ok");
});
```

**3) الحروف `? + * [] () !` محجوزة** ومينفعش تتستخدم كحروف عادية في الـ path (لو احتجتيها اعملي لها escape بـ `\`).

**4) مفيش regex جوه الـ string paths:**

```js
// ❌ مش مدعوم في Express 5
app.get("/users/:id(\\d+)", handler);
```

والبديل: تتحققي من الـ id جوه الـ handler، أو تستخدمي regex كامل كـ path.

### الـ Route Handlers المتعددة

الـ route الواحد ممكن يكون ليه **أكتر من دالة**، وكل واحدة تنادي `next()` عشان تسلم للي بعدها:

```js
app.get(
  "/example/b",
  (req, res, next) => {
    console.log("الأولى...");
    next(); // سلّمي للدالة اللي بعدها
  },
  (req, res) => {
    res.send("Hello from B!");
  },
);
```

وممكن تعمليهم **array**:

```js
const cb0 = (req, res, next) => {
  console.log("CB0");
  next();
};
const cb1 = (req, res, next) => {
  console.log("CB1");
  next();
};
const cb2 = (req, res) => res.send("Hello from C!");

app.get("/example/c", [cb0, cb1, cb2]);
```

### `next('route')`: تخطي باقي الـ handlers لنفس الـ route

```js
app.get("/user/:id", (req, res, next) => {
  if (req.params.id === "0") return next("route"); // روحي للـ route اللي بعده
  res.send(`User ${req.params.id}`);
});

app.get("/user/:id", (req, res) => {
  res.send("Special handler for user ID 0");
});
```

### `app.all()`: لكل الـ Methods

```js
app.all("/secret", (req, res, next) => {
  console.log("Accessing the secret section ...");
  next();
});
```

### `app.route()`: تجميع methods على نفس المسار

بتقلل التكرار وأخطاء الكتابة:

```js
app
  .route("/book")
  .get((req, res) => res.send("Get a random book"))
  .post((req, res) => res.send("Add a book"))
  .put((req, res) => res.send("Update the book"));
```

### Response Methods: لازم **واحدة** منها تتنادي

من الـ docs: لو معملتيش أي واحدة منهم في الـ handler، الطلب هيفضل **معلّق (hanging)** والعميل مش هيستلم رد.

| الدالة                 | بتعمل إيه                                |
| ---------------------- | ---------------------------------------- |
| `res.send()`           | تبعت رد بأنواع مختلفة (نص، HTML، Buffer) |
| `res.json()`           | تبعت JSON                                |
| `res.status(code)`     | تحدد الـ status (بتتسلسل مع غيرها)       |
| `res.sendStatus(code)` | تحدد الـ status وتبعت وصفه كنص           |
| `res.redirect()`       | تحوّل لـ URL تاني                        |
| `res.sendFile()`       | تبعت ملف                                 |
| `res.download()`       | تخلي المتصفح ينزّل ملف                   |
| `res.render()`         | تعمل render لـ template                  |
| `res.end()`            | تنهي الرد من غير بيانات                  |

```js
res.status(404).json({ error: "Not found" }); // سلسلة
```

### `express.Router`: تقسيم الـ Routes على ملفات

**المشكلة:** لو كل الـ routes في ملف واحد، الملف هيبقى ضخم ومش منظم.

**الحل:** الـ `Router` هو **"mini-app"** (من الـ docs: نظام routing وmiddleware كامل). بتعملي ملف لكل مجموعة routes وتركّبيه على مسار.

**`routes/birds.js`:**

```js
import express from "express";

const router = express.Router();

// middleware خاص بالـ router ده بس
router.use((req, res, next) => {
  console.log("Time:", Date.now());
  next();
});

router.get("/", (req, res) => res.send("Birds home page"));
router.get("/about", (req, res) => res.send("About birds"));

export default router;
```

**`index.js`:**

```js
import birds from "./routes/birds.js";

app.use("/birds", birds);
// دلوقتي: GET /birds  و  GET /birds/about  شغالين
```

> الـ router جوه ملفه بيعرّف المسارات **نسبةً للـ mount path**، يعني `"/"` جواه = `/birds` بره.

**`mergeParams`:** لو الـ parent route فيه params (زي `/users/:userId/posts`) وعايزة الـ sub-router يشوفها:

```js
const router = express.Router({ mergeParams: true });
```

### هيكل مشروع منظم

```
my-express-app/
├── index.js            ← إعداد app والـ middleware وتركيب الـ routers
├── routes/
│   ├── users.js
│   └── todos.js
└── package.json
```

### ⚠️ الترتيب مهم!

Express بيطابق الـ routes **بالترتيب اللي اتعرّفت بيه**، وأول واحدة تطابق وترد هي اللي بتنفذ:

```js
app.get("/users/:id", (req, res) => res.send("user by id"));
app.get("/users/me", (req, res) => res.send("current user")); // ❌ عمره ما هيتنفذ!
// "/users/me" هيتطابق مع "/users/:id" الأول (id = "me")
```

الحل: حطي الـ routes **الأكتر تحديدًا** الأول.

### الـ 404 (route مش موجود)

بنحطه **آخر حاجة**، بعد كل الـ routes:

```js
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});
```

### مثال شامل: CRUD API (بيانات في الذاكرة)

```js
import express from "express";

const app = express();
app.use(express.json());

let todos = [{ id: 1, title: "Learn Express", done: false }];
let nextId = 2;

// READ all (+ فلترة بالـ query)  →  GET /todos?done=true
app.get("/todos", (req, res) => {
  const { done } = req.query;
  const result =
    done === undefined ? todos : todos.filter((t) => String(t.done) === done);
  res.json(result);
});

// READ one  →  GET /todos/1
app.get("/todos/:id", (req, res) => {
  const todo = todos.find((t) => t.id === Number(req.params.id));
  if (!todo) return res.status(404).json({ error: "Todo not found" });
  res.json(todo);
});

// CREATE  →  POST /todos   body: { "title": "..." }
app.post("/todos", (req, res) => {
  const { title } = req.body ?? {};
  if (!title) return res.status(400).json({ error: "title is required" });

  const todo = { id: nextId++, title, done: false };
  todos.push(todo);
  res.status(201).json(todo);
});

// UPDATE  →  PATCH /todos/1   body: { "done": true }
app.patch("/todos/:id", (req, res) => {
  const todo = todos.find((t) => t.id === Number(req.params.id));
  if (!todo) return res.status(404).json({ error: "Todo not found" });

  Object.assign(todo, req.body);
  res.json(todo);
});

// DELETE  →  DELETE /todos/1
app.delete("/todos/:id", (req, res) => {
  const exists = todos.some((t) => t.id === Number(req.params.id));
  if (!exists) return res.status(404).json({ error: "Todo not found" });

  todos = todos.filter((t) => t.id !== Number(req.params.id));
  res.status(204).end();
});

app.listen(3000, () => console.log("http://localhost:3000"));
```

**إزاي تجربيه؟** المتصفح بيعمل GET بس، فاستخدمي أداة تبعت POST/PATCH/DELETE: **Postman** أو **Thunder Client** (إضافة VS Code) أو **curl**:

```bash
curl -X POST http://localhost:3000/todos -H "Content-Type: application/json" -d '{"title":"Practice routing"}'
```

> **ليه `return` قبل `res.status(404)...`؟** عشان الدالة تقف هناك، ومتكملش وتبعت رد تاني (هيطلع error `Cannot set headers after they are sent`).

---

## 3. Middlewares

### الفكرة

**الـ Middleware** هو **دالة بتقعد في نص الطريق بين الطلب والرد**. بتاخد 3 حاجات (من الـ docs):

- كائن الطلب `req`
- كائن الرد `res`
- الدالة `next` اللي بتسلّم التحكم للـ middleware اللي بعدها

تخيليها **نقاط تفتيش في المطار**: الراكب (الطلب) بيعدي على نقطة جوازات، وبعدين أمن، وبعدين البوابة. كل نقطة ممكن تسيبه يعدي (`next`) أو توقفه وترجّعه (`res.send`).

```
Request ─► [logger] ─► [express.json] ─► [auth] ─► [route handler] ─► Response
              │next()       │next()        │next()      │res.json()
                                            │
                          (لو فشل: res.status(401).json(...) والدورة بتقف هنا)
```

### الـ Middleware ممكن يعمل إيه؟ (من الـ docs)

1. ينفذ **أي كود**.
2. **يعدّل** كائني `req` و `res`.
3. **ينهي** دورة (طلب ← رد).
4. **يسلّم** التحكم للـ middleware اللي بعده.

### المشكلة اللي بيحلها

عندك 20 route، وكلهم محتاجين:

- تسجيل (logging) لكل طلب.
- التحقق من إن المستخدم مسجّل دخول.
- قراءة الـ JSON body.

لو كتبتي الكود ده جوه كل handler، هتكرريه 20 مرة. **الحل:** تكتبيه مرة واحدة كـ middleware وتطبقيه على كل الـ routes (أو على اللي محتاجاه).

### أبسط Middleware

```js
function logger(req, res, next) {
  console.log(`${req.method} ${req.originalUrl}`);
  next(); // ⚠️ مهم جدًا
}

app.use(logger);
```

### القاعدة الذهبية

من الـ docs: لو الـ middleware **مش بينهي** دورة الطلب والرد، **لازم ينادي `next()`**، وإلا الطلب هيفضل **معلّق** والعميل مش هيستلم حاجة.

يعني في الـ middleware عندك اختيارين بس:

- **تنهي الرد:** `res.send()` / `res.json()` / ...
- **أو تكملي:** `next()`

(مش الاتنين، ومش ولا واحد!)

### أنواع الـ Middleware (الخمسة من الـ docs)

#### 1) Application-level

مربوط بكائن `app` بـ `app.use()` أو `app.METHOD()`:

```js
// من غير مسار: بيتنفذ مع كل طلب
app.use((req, res, next) => {
  console.log("Time:", Date.now());
  next();
});

// مربوط بمسار: لأي method على /user/:id
app.use("/user/:id", (req, res, next) => {
  console.log("Request Type:", req.method);
  next();
});

// middleware متعدد (sub-stack)
app.use(
  "/user/:id",
  (req, res, next) => {
    console.log("Request URL:", req.originalUrl);
    next();
  },
  (req, res, next) => {
    console.log("Request Type:", req.method);
    next();
  },
);
```

#### 2) Router-level

نفس الفكرة بس مربوط بـ `express.Router()`:

```js
const router = express.Router();

router.use((req, res, next) => {
  console.log("بيتنفذ لأي طلب على الـ router ده بس");
  next();
});
```

#### 3) Error-handling

دوال بـ **4 معاملات** `(err, req, res, next)` (هنشرحه في قسم لوحده تحت).

#### 4) Built-in (جاهزة مع Express)

| الدالة                                   | وظيفتها                                    |
| ---------------------------------------- | ------------------------------------------ |
| `express.json()`                         | بتقرا الـ body لو JSON وتحطه في `req.body` |
| `express.urlencoded({ extended: true })` | بتقرا الـ body لو جاي من form HTML         |
| `express.static("public")`               | بتقدم ملفات ثابتة (صور، CSS، HTML)         |
| `express.text()`                         | بتقرا الـ body كنص                         |
| `express.raw()`                          | بتقرا الـ body كـ Buffer                   |

```js
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
```

> **ليه `req.body` بيطلع `undefined`؟** لأنك نسيتي `app.use(express.json())`. في Express 5 مفيش `req.body` من الأساس من غير ما middleware يقراه.

#### 5) Third-party (من npm)

بتنزّليها وتستخدميها:

```bash
npm install morgan cors
```

```js
import morgan from "morgan";
import cors from "cors";

app.use(morgan("dev")); // logging جاهز وأنيق
app.use(cors()); // السماح للفرونت (بدومين تاني) إنه يكلم الـ API
```

أشهرهم: **`morgan`** (logging)، **`cors`** (الـ Cross-Origin)، **`helmet`** (headers أمان)، **`cookie-parser`** (قراءة الكوكيز). وتقدري تشوفي قايمة كاملة في صفحة الـ Middleware في الـ docs.

> **ربط بالفرونت اللي اتعلمتيه:** لما React على `localhost:5173` يكلم API على `localhost:3000` من غير `cors()` المتصفح هيرفض الطلب. ده سبب إنك هتحتاجيه كتير.

### `next()` وأشكاله

| الاستدعاء        | معناه                                                                 |
| ---------------- | --------------------------------------------------------------------- |
| `next()`         | روحي للـ middleware/handler اللي بعده                                 |
| `next(err)`      | في **مشكلة**: تخطي كل الـ handlers العادية وروحي لـ **error handler** |
| `next("route")`  | تخطي باقي handlers الـ route الحالي وروحي لـ route تاني مطابق         |
| `next("router")` | اخرجي من الـ router الحالي كله وارجعي للـ app                         |

**مثال `next("router")` من الـ docs:** الـ router يرد بس لو الطلب فيه header معين، غير كده يطلع منه:

```js
const router = express.Router();

router.use((req, res, next) => {
  if (!req.headers["x-auth"]) return next("router"); // اخرج من الـ router
  next();
});

router.get("/user/:id", (req, res) => res.send("hello, user!"));

app.use("/admin", router, (req, res) => {
  res.sendStatus(401); // أي حاجة خرجت من الـ router توصل هنا
});
```

### ⚠️ الترتيب هو كل حاجة!

الـ middleware بيتنفذ **بالترتيب اللي اتسجل بيه**:

```js
app.use(logger); // 1
app.use(express.json()); // 2
app.use("/api", apiRouter); // 3
app.use(notFound); // 4: بعد كل الـ routes
app.use(errorHandler); // 5: آخر حاجة دايمًا
```

**أخطاء الترتيب الشائعة:**

- `express.json()` بعد الـ routes ← `req.body` هيبقى `undefined` جواها.
- الـ 404 handler قبل الـ routes ← كل الطلبات هتطلع 404.
- الـ error handler مش آخر حاجة ← مش هيمسك أخطاء اللي بعده.

### أمثلة Custom Middleware

**1) قياس وقت الطلب:**

```js
app.use((req, res, next) => {
  const start = Date.now();

  // "finish" بيتطلق لما الرد يتبعت فعلًا
  res.on("finish", () => {
    console.log(
      `${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - start}ms)`,
    );
  });

  next();
});
```

**2) حماية route بمفتاح (authentication مبسّط):**

```js
function requireApiKey(req, res, next) {
  if (req.get("x-api-key") !== "my-secret") {
    return res.status(401).json({ error: "Unauthorized" }); // وقفنا هنا
  }
  next(); // عدّينا
}

// بيتطبق على route واحد بس
app.get("/admin", requireApiKey, (req, res) => {
  res.send("Welcome, admin");
});
```

**3) تمرير بيانات من middleware لـ handler:**

```js
function attachUser(req, res, next) {
  req.user = { id: 1, name: "Sara" }; // بنزوّد على req
  next();
}

app.get("/profile", attachUser, (req, res) => {
  res.json(req.user); // الـ handler بيستخدمه
});
```

**4) Middleware بيقبل إعدادات (دالة بترجّع دالة):**

```js
function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

app.delete("/users/:id", attachUser, requireRole("admin"), (req, res) => { ... });
```

### Error Handling Middleware

**المشكلة:** لو حصل error في أي مكان وإنتي مسكتيهوش، الطلب هيفشل بشكل غير منظم.

**الحل:** دالة بـ **4 معاملات بالظبط** `(err, req, res, next)`، بتتحط **آخر حاجة** بعد كل الـ routes:

```js
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something broke!" });
});
```

> ⚠️ **من الـ docs:** لازم تكتبي الـ 4 معاملات حتى لو مش هتستخدمي `next`. لو كتبتي 3 بس، Express هيعتبرها middleware عادي ومش هتمسك الأخطاء.

**إزاي الأخطاء بتوصل للـ error handler؟**

| الحالة                                   | الحل                                                                               |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| **كود sync** بيعمل `throw`               | Express بيمسكه لوحده ✅                                                            |
| **دالة `async`** (Express 5)             | لو الـ promise اتـ reject أو حصل throw، Express بينادي `next(err)` **تلقائيًا** ✅ |
| **callbacks** (زي `fs.readFile` القديمة) | لازم تنادي `next(err)` بإيدك                                                       |
| **`setTimeout` وأمثالها**                | لازم `try/catch` جواها وتنادي `next(err)`                                          |

```js
// Express 5: مفيش حاجة تتعمل، الخطأ بيوصل للـ error handler لوحده
app.get("/users/:id", async (req, res) => {
  const user = await getUserById(req.params.id); // لو رمى error → error handler
  res.json(user);
});
```

> ⚠️ **في Express 4** كان لازم `try/catch` وتنادي `next(err)` في كل async handler. لو الفيديو بيعمله كده، ده سبب قديم، وفي Express 5 مش ضروري.

**الـ Default Error Handler:** Express عنده error handler جاهز في آخر الـ stack، فلو معملتيش واحد بتاعك، بيرد بـ stack trace (وفي `NODE_ENV=production` بيخفيه). والـ status بيتحدد من `err.status` أو `err.statusCode`، وأي قيمة بره الـ 4xx/5xx بتتحول لـ 500.

**نقطة مهمة في الـ custom error handler:** لو الـ headers اتبعتت خلاص (مثلًا وإنتي بتبعتي stream)، مينفعش تبعتي رد تاني، فسلّميها للـ default handler:

```js
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  res.status(err.status ?? 500).json({ error: err.message });
});
```

**مثال بخطأ مخصص:**

```js
class AppError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

app.get("/todos/:id", (req, res) => {
  const todo = todos.find((t) => t.id === Number(req.params.id));
  if (!todo) throw new AppError("Todo not found", 404); // مفيش try/catch
  res.json(todo);
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  res.status(err.status ?? 500).json({ error: err.message });
});
```

### أخطاء شائعة في الـ Middleware

| الخطأ                            | النتيجة                  | الحل                                                   |
| -------------------------------- | ------------------------ | ------------------------------------------------------ |
| نسيان `next()`                   | الطلب معلّق للأبد        | نادي `next()` أو ارد                                   |
| `next()` **وبعدها** `res.send()` | `ERR_HTTP_HEADERS_SENT`  | استخدمي `return next()` أو `return res...`             |
| نسيان `express.json()`           | `req.body` = `undefined` | `app.use(express.json())` قبل الـ routes               |
| error handler بـ 3 معاملات       | مبيمسكش الأخطاء          | اكتبي `(err, req, res, next)`                          |
| ترتيب غلط                        | حاجات متتنفذش            | الـ parsers الأول، الـ 404 والـ error handler آخر حاجة |
| middleware sync تقيل             | السيرفر كله بيتجمد       | شوفي الربط تحت 👇                                      |

### 🔗 الربط بسيشن 3 (الـ Event Loop)

كل middleware وhandler بيتنفذ **على الـ main thread** جوه callback الطلب. يعني:

- لو middleware فيه `while` loop أو حسابات تقيلة أو `readFileSync` كبير، **كل المستخدمين هيستنوا** (نفس تجربة الـ `/block` اللي عملناها).
- استخدمي دايمًا العمليات الـ **async** (`fs/promises`، `await`) جوه الـ middleware والـ handlers.
- لما بتعملي `await` في handler، الكود اللي بعده بيتحول لـ **Microtask**، والـ Event Loop حر يخدم طلبات تانية في الوقت ده.

---

## 4. الصورة الكاملة: مشروع صغير يجمع كل حاجة

**هيكل المشروع:**

```
todo-api/
├── index.js
├── routes/
│   └── todos.js
├── middleware/
│   └── logger.js
└── package.json
```

**`middleware/logger.js`:**

```js
export function logger(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    console.log(
      `${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - start}ms)`,
    );
  });
  next();
}
```

**`routes/todos.js`:**

```js
import express from "express";

const router = express.Router();

let todos = [{ id: 1, title: "Learn Express", done: false }];
let nextId = 2;

router.get("/", (req, res) => res.json(todos));

router.get("/:id", (req, res) => {
  const todo = todos.find((t) => t.id === Number(req.params.id));
  if (!todo) return res.status(404).json({ error: "Todo not found" });
  res.json(todo);
});

router.post("/", (req, res) => {
  const { title } = req.body ?? {};
  if (!title) return res.status(400).json({ error: "title is required" });
  const todo = { id: nextId++, title, done: false };
  todos.push(todo);
  res.status(201).json(todo);
});

router.delete("/:id", (req, res) => {
  todos = todos.filter((t) => t.id !== Number(req.params.id));
  res.status(204).end();
});

export default router;
```

**`index.js`:**

```js
import express from "express";
import { logger } from "./middleware/logger.js";
import todosRouter from "./routes/todos.js";

const app = express();

// 1) Middleware عامة (الأول)
app.use(logger);
app.use(express.json());

// 2) Routes
app.use("/todos", todosRouter);

// 3) 404 (بعد كل الـ routes)
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// 4) Error handler (آخر حاجة)
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  res.status(err.status ?? 500).json({ error: err.message });
});

app.listen(3000, () => console.log("http://localhost:3000"));
```

**الدورة بتمشي كده لطلب `POST /todos`:**

```
logger → express.json → todosRouter (POST /) → res.status(201).json(...)
```

**ولطلب على `/xyz`:**

```
logger → express.json → (مفيش route مطابق) → 404 handler
```

**ولو حصل error جوه route:**

```
... → next(err) تلقائي → تخطي الباقي → error handler
```

---

## الخلاصة: الجدول الكبير

| المفهوم                | هو إيه؟                              | بيحل إيه؟                                      |
| ---------------------- | ------------------------------------ | ---------------------------------------------- |
| **Express**            | framework فوق `http`                 | تعقيد السيرفر الخام (routing، body، responses) |
| **Routing**            | ربط (method + path) بدالة            | `if/else` الطويلة                              |
| **`req.params`**       | متغيرات في المسار                    | تحديد مورد معين `/users/5`                     |
| **`req.query`**        | بعد `؟`                              | فلترة وبحث                                     |
| **`req.body`**         | جسم الطلب                            | بيانات الإنشاء والتعديل                        |
| **`express.Router`**   | mini-app                             | تقسيم الـ routes على ملفات                     |
| **Middleware**         | دالة `(req, res, next)` في نص الطريق | تكرار الكود المشترك                            |
| **`next()`**           | تسليم للي بعده                       | ربط الـ middleware ببعض                        |
| **Error middleware**   | دالة بـ 4 معاملات                    | معالجة الأخطاء في مكان واحد                    |
| **Built-in/3rd-party** | `express.json`, `cors`, `morgan`     | شغل جاهز مش محتاجة تكتبيه                      |

### القواعد الذهبية

1. **كل طلب لازم ينتهي برد** (`res.send`/`json`/...) **أو يكمل** (`next`).
2. **الترتيب** في تسجيل الـ middleware والـ routes **بيفرق**.
3. الـ **404** والـ **error handler** يتحطوا **آخر حاجة**.
4. استخدمي `return` قبل `res.` أو `next()` عشان متبعتيش رد مرتين.
5. على Express 5: الـ wildcard محتاج اسم (`/*splat`) والـ async errors بتتمسك لوحدها.

---

## حاجات مش فاهماها

-

## تطبيق من دماغي

- [ ] نفذي مشروع الـ Todo API وجربيه بـ Postman أو Thunder Client.
- [ ] ضيفي `PATCH /todos/:id` لتعديل todo.
- [ ] ضيفي filter بـ query: `GET /todos?done=true`.
- [ ] اعملي middleware `requireApiKey` وطبقيه على `DELETE` بس.
- [ ] ثبّتي `morgan` وقارني الـ logging بتاعه بالـ logger اللي كتبتيه بإيدك.
- [ ] اعملي route بيرمي error (`throw new Error("test")`) وشوفي الـ error handler شغال.
- [ ] جربي تحطي `express.json()` **بعد** الـ routes وشوفي `req.body` بيطلع إيه.
- [ ] حوّلي الـ Study Log CLI بتاعك لـ **API** (`GET /sessions`, `POST /sessions`, `DELETE /sessions/:id`)، ده مشروع حلو للبورتفوليو.

---

## المصادر (الـ Documentation)

- [Express: Routing](https://expressjs.com/en/5x/guide/routing)
- [Express: Using middleware](https://expressjs.com/en/5x/guide/using-middleware)
- [Express: Writing middleware](https://expressjs.com/en/5x/guide/writing-middleware)
- [Express: Error handling](https://expressjs.com/en/5x/guide/error-handling)
- [Express: Basic routing](https://expressjs.com/en/5x/starter/basic-routing)
- [Express: Moving to Express 5 (Migration guide)](https://expressjs.com/en/guide/migrating-5)
- [Express: Third-party middleware list](https://expressjs.com/en/resources/middleware/)
- [Express API Reference (5.x)](https://expressjs.com/en/5x/api)s
