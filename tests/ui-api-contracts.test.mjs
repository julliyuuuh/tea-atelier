import assert from "node:assert/strict";
import { test, beforeEach, after } from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import crypto from "node:crypto";
const { PGlite } = await import(
  process.env.PGLITE_MODULE_PATH || "@electric-sql/pglite"
);
const db = new PGlite();
let queue = Promise.resolve(),
  emailFailure = false,
  secretNumber = 0,
  googleEmail;
const pool = {
  query: (sql, values) => db.query(sql, values),
  async connect() {
    const previous = queue;
    let release;
    queue = new Promise((resolve) => (release = resolve));
    await previous;
    return { query: pool.query, release };
  },
};
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      module,
      exports: module.exports,
      console,
      URL,
      Request,
      Response,
      TextEncoder,
      Date,
      process: { env: { JWT_SECRET: "auth-test-fixture" } },
      require(name) {
        if (name === "@/lib/db") return { pool };
        if (name === "@/lib/admin-audit")
          return {
            adminQuery: async (_id, sql, values) => pool.query(sql, values),
          };
        if (name === "@/lib/auth-server")
          return {
            verifyToken(token) {
              if (!/^[1-9]\d*$/.test(token)) throw Error("Bad token");
              return { userId: Number(token), role: "super_admin" };
            },
            verifyPassword: async (password) => password === "correct-password",
            hashPassword: async () => "hashed",
            signToken: () => "issued-token",
          };
        if (name === "otpauth")
          return {
            Secret: class {
              base32 = `SECRET${++secretNumber}`;
              static fromBase32(value) {
                return value;
              }
            },
            TOTP: class {
              toString() {
                return "otpauth://test";
              }
              validate({ token }) {
                return token === "123456" ? 0 : null;
              }
            },
          };
        if (name === "qrcode")
          return {
            default: { toDataURL: async () => "data:image/png;base64,fixture" },
          };
        if (name === "google-auth-library")
          return {
            OAuth2Client: class {
              async verifyIdToken() {
                return {
                  getPayload: () => ({
                    email: googleEmail,
                    given_name: "Google",
                    family_name: "Buyer",
                    sub: "google-id",
                    email_verified: true,
                  }),
                };
              }
            },
          };
        if (name === "resend")
          return {
            Resend: class {
              emails = {
                send: async () => ({
                  error: emailFailure ? { message: "Rejected" } : null,
                  data: { id: "email-fixture" },
                }),
              };
            },
          };
        if (name === "crypto") return { default: crypto };
        if (name === "node:crypto") return crypto;
        if (name === "node:net") return { isIP: () => 0 };
        if (name === "next/server")
          return {
            NextResponse: { json: (body, init) => Response.json(body, init) },
          };
        if (name.startsWith("@/")) return load(name.slice(2) + ".ts");
        throw Error(name);
      },
    },
  );
  cache.set(file, module.exports);
  return module.exports;
}
const cart = load("app/api/cart/route.ts"),
  cartItem = load("app/api/cart/[productId]/route.ts"),
  catalog = load("app/api/products/route.ts"),
  detail = load("app/api/products/[id]/route.ts"),
  bestSellers = load("app/api/products/best-sellers/route.ts");
const admin = load("lib/require-admin.ts"),
  login = load("app/api/login/route.ts"),
  google = load("app/api/auth/google/route.ts"),
  signup = load("app/api/signup/route.ts");
const setup = load("app/api/2fa/setup/route.ts"),
  confirm = load("app/api/2fa/confirm/route.ts"),
  status = load("app/api/2fa/status/route.ts"),
  disable = load("app/api/2fa/disable/route.ts");
const contact = load("app/api/admin/contact/[id]/route.ts"),
  cms = load("lib/cms-client.ts"),
  hero = load("app/api/cms/admin/hero/route.ts"),
  productAdmin = load("app/api/admin/products/route.ts"),
  productEdit = load("app/api/admin/products/[id]/route.ts");
const request = (body, user = "1", method = "POST") =>
  new Request("http://test/api", {
    method,
    headers: user ? { Authorization: `Bearer ${user}` } : {},
    ...(method === "GET" ? {} : { body: JSON.stringify(body) }),
  });
const params = (id) => ({
  params: Promise.resolve({ id: String(id), productId: String(id) }),
});
beforeEach(async () => {
  emailFailure = false;
  await db.exec(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;
    CREATE TABLE users(user_id SERIAL PRIMARY KEY,first_name TEXT,last_name TEXT,email TEXT UNIQUE,phone_number TEXT,password_hash TEXT,role TEXT DEFAULT 'customer',is_suspended BOOLEAN DEFAULT false,is_verified BOOLEAN DEFAULT false,avatar_url TEXT,google_id TEXT,totp_secret TEXT,totp_enabled BOOLEAN DEFAULT false,verification_token TEXT,verification_token_expires TIMESTAMPTZ);
    INSERT INTO users(user_id,first_name,last_name,email,phone_number,password_hash,role,is_verified,avatar_url) VALUES(1,'Tea','Buyer','buyer@example.test','09123456789','hash','customer',true,'https://example.test/avatar.png'),(2,'Other','Buyer','other@example.test',NULL,'hash','customer',false,NULL),(9,'Super','Admin','admin@example.test',NULL,'hash','super_admin',true,NULL);
    SELECT setval('users_user_id_seq',9);
    CREATE TABLE products(product_id SERIAL PRIMARY KEY,product_name TEXT,product_desc TEXT,product_image TEXT,gallery_images JSONB NOT NULL DEFAULT '[]'::JSONB,category TEXT,sub_category TEXT,type TEXT,price NUMERIC(12,2),stock_quantity INTEGER,is_archived BOOLEAN DEFAULT false,status TEXT DEFAULT 'IN STOCK');
    INSERT INTO products(product_id,product_name,product_desc,category,sub_category,type,price,stock_quantity,status,is_archived) VALUES(1,'Renamed blend','Tea','Leaf Tea','Green Tea','Sencha',100,5,'IN STOCK',false),(2,'Sold out','Tea','Matcha',NULL,NULL,150,0,'NO STOCK',false),(3,'Archived','Tea','Matcha',NULL,NULL,200,10,'IN STOCK',true),(4,'Unavailable','Tea','Matcha',NULL,NULL,120,10,'NO STOCK',false);
    SELECT setval('products_product_id_seq',4);
    CREATE TABLE cart(cart_id SERIAL PRIMARY KEY,user_id INTEGER,product_id INTEGER,quantity INTEGER);
    CREATE TABLE orders(order_id INTEGER PRIMARY KEY,user_id INTEGER,payment_status TEXT,order_status TEXT,total_amount NUMERIC(12,2));
    CREATE TABLE order_items(order_id INTEGER,product_id INTEGER,quantity INTEGER,price NUMERIC(12,2));
    CREATE TABLE contact_messages(message_id INTEGER PRIMARY KEY,user_id INTEGER,subject TEXT,message TEXT,status TEXT,admin_reply TEXT,replied_at TIMESTAMPTZ);
    INSERT INTO contact_messages VALUES(1,1,'Question','<original>','new',NULL,NULL);
    CREATE TABLE homepage_hero(id INTEGER PRIMARY KEY,volume_label TEXT,eyebrow TEXT,heading TEXT,subheading TEXT,cta_text TEXT,cta_link TEXT,image_url TEXT,image_caption TEXT);
  `);
  await db.exec(fs.readFileSync("lib/db/migrations/20261028_auth_rate_limits.sql", "utf8"));
  await db.exec(
    "CREATE TABLE store_settings(settings_id int primary key,config jsonb,version int default 1,updated_at timestamptz default now())",
  );
  await db.query(
    "INSERT INTO store_settings(settings_id,config) VALUES(1,$1)",
    [JSON.stringify(load("lib/store-settings.ts").DEFAULT_SETTINGS)],
  );
});
after(() => db.close());

test("catalog and cart expose real taxonomy even when a product has been renamed", async () => {
  const data = await (await catalog.GET()).json();
  assert.equal(data.products.length, 3);
  assert.equal(
    data.products.find((p) => p.id === "1").subCategory,
    "Green Tea",
  );
  assert.equal(
    (await (await detail.GET(request(null, "1", "GET"), params(1))).json())
      .product.type,
    "Sencha",
  );
  await db.exec(
    "INSERT INTO cart(user_id,product_id,quantity) VALUES(1,1,1),(1,3,1)",
  );
  const rows = await (await cart.GET(request(null, "1", "GET"))).json();
  assert.equal(
    rows.find((row) => row.product.id === "1").product.subCategory,
    "Green Tea",
  );
  assert.equal(
    rows.find((row) => row.product.id === "3").product.availability,
    "Out of Stock",
  );
});

test("cart rejects invalid quantities, missing rows and unavailable products without mutations", async () => {
  for (const quantity of [0, -1, 1.5, "2", null, 2147483648])
    assert.equal(
      (await cart.POST(request({ productId: "1", quantity }))).status,
      400,
    );
  for (const productId of ["bad", "0", -1, 1.2])
    assert.equal(
      (await cart.POST(request({ productId, quantity: 1 }))).status,
      400,
    );
  for (const productId of [2, 3, 4, 999])
    assert.ok(
      (await cart.POST(request({ productId, quantity: 1 }))).status >= 400,
    );
  assert.equal(
    (await cartItem.PATCH(request({ quantity: 1 }, "1", "PATCH"), params(1)))
      .status,
    404,
  );
  assert.equal(
    (await db.query("SELECT count(*)::int n FROM cart")).rows[0].n,
    0,
  );
});

test("simultaneous adds preserve increments, enforce stock and keep customers isolated", async () => {
  const responses = await Promise.all([
    cart.POST(request({ productId: "1", quantity: 2 })),
    cart.POST(request({ productId: "1", quantity: 2 })),
  ]);
  assert.deepEqual(
    responses.map((r) => r.status),
    [200, 200],
  );
  assert.equal(
    (await db.query("SELECT quantity FROM cart WHERE user_id=1")).rows[0]
      .quantity,
    4,
  );
  assert.equal(
    (await cart.POST(request({ productId: "1", quantity: 2 }))).status,
    409,
  );
  assert.equal(
    (await cart.POST(request({ productId: "1", quantity: 1 }, "2"))).status,
    200,
  );
  assert.equal(
    (await cartItem.PATCH(request({ quantity: 3 }, "1", "PATCH"), params(1)))
      .status,
    200,
  );
  assert.equal(
    (await db.query("SELECT quantity FROM cart WHERE user_id=2")).rows[0]
      .quantity,
    1,
  );
});

test("deleted and suspended accounts cannot read or mutate carts or security settings", async () => {
  for (const user of ["8", "2"]) {
    if (user === "2")
      await db.exec("UPDATE users SET is_suspended=true WHERE user_id=2");
    const expected = user === "8" ? 401 : 403;
    assert.equal((await cart.GET(request(null, user, "GET"))).status, expected);
    assert.equal(
      (await cart.POST(request({ productId: 1 }, user))).status,
      expected,
    );
    assert.equal((await setup.POST(request({}, user))).status, expected);
    assert.equal(
      (await status.GET(request(null, user, "GET"))).status,
      expected,
    );
    assert.equal(
      (await confirm.POST(request({ code: "123456" }, user))).status,
      expected,
    );
    assert.equal((await disable.POST(request({}, user))).status, expected);
  }
  await db.exec("UPDATE users SET is_suspended=true WHERE user_id=9");
  assert.equal((await admin.requireAdmin(request({}, "9"))).error.status, 403);
});

test("best sellers exclude failed, pending, cancelled and archived sales", async () => {
  await db.exec(
    `INSERT INTO orders VALUES(1,1,'paid','DELIVERED',100),(2,1,'failed','PLACED',5000),(3,1,'pending','PLACED',7000),(4,1,'paid','CANCELLED',9000); INSERT INTO order_items VALUES(1,1,1,100),(2,2,50,100),(3,2,70,100),(4,2,90,100),(1,3,1,5000);`,
  );
  const data = await (await bestSellers.GET()).json();
  assert.deepEqual(
    data.products.map((p) => p.id),
    ["1"],
  );
});

test("password login returns the profile and verification fields the account UI needs", async () => {
  const response = await login.POST(
    request({ email: "buyer@example.test", password: "correct-password" }),
  );
  assert.equal(response.status, 200);
  const { user } = await response.json();
  assert.equal(user.firstName, "Tea");
  assert.equal(user.lastName, "Buyer");
  assert.equal(user.phone, "09123456789");
  assert.equal(user.isVerified, true);
  assert.equal(user.avatarUrl, "https://example.test/avatar.png");
  assert.equal(
    (
      await login.POST(
        request({ email: "buyer@example.test", password: "wrong" }),
      )
    ).status,
    401,
  );
});

test("Google and password signup return truthful verification states", async () => {
  googleEmail = "google@example.test";
  const googleResponse = await google.POST(request({ credential: "fixture" }));
  assert.equal(googleResponse.status, 200);
  assert.equal((await googleResponse.json()).user.isVerified, true);
  const response = await signup.POST(
    request({
      firstName: "New",
      lastName: "Buyer",
      email: "new@example.test",
      password: "Correct-password1",
    }),
  );
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.user.isVerified, false);
  assert.equal(data.user.avatarUrl, null);
});

test("2FA setup cannot replace an enabled secret, and confirmation rejects malformed codes", async () => {
  await db.exec(
    "UPDATE users SET totp_secret='EXISTING',totp_enabled=true WHERE user_id=1",
  );
  assert.equal((await setup.POST(request({}))).status, 409);
  assert.equal((await confirm.POST(request({ code: "123456" }))).status, 409);
  assert.equal(
    (await db.query("SELECT totp_secret FROM users WHERE user_id=1")).rows[0]
      .totp_secret,
    "EXISTING",
  );
  for (const code of [123456, {}, "123", "abcdef"])
    assert.equal((await confirm.POST(request({ code }))).status, 400);
  await disable.POST(request({}));
  assert.equal((await setup.POST(request({}))).status, 200);
  assert.equal((await confirm.POST(request({ code: "123456" }))).status, 200);
  assert.equal(
    (await (await status.GET(request(null, "1", "GET"))).json()).enabled,
    true,
  );
});

test("contact replies report email rejection separately from successful database storage", async () => {
  emailFailure = true;
  const response = await contact.PATCH(
    request({ action: "reply", adminReply: "<reply>" }, "9", "PATCH"),
    params(1),
  );
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.status, "replied");
  assert.equal(data.emailAccepted, false);
  assert.match(data.warning, /Reply saved/);
  assert.equal(
    (
      await db.query(
        "SELECT admin_reply FROM contact_messages WHERE message_id=1",
      )
    ).rows[0].admin_reply,
    "<reply>",
  );
  emailFailure = false;
  assert.equal(
    (
      await (
        await contact.PATCH(
          request({ action: "reply", adminReply: "New reply" }, "9", "PATCH"),
          params(1),
        )
      ).json()
    ).emailAccepted,
    true,
  );
});

test("CMS reorder waits for all writes before reporting errors and missing singleton updates return 404", async () => {
  let finish,
    completed = false;
  const delayed = new Promise(
    (resolve) =>
      (finish = () => {
        completed = true;
        resolve(Response.json({}));
      }),
  );
  const save = cms.checkCmsSaves([
    Promise.resolve(
      Response.json({ error: "Record removed" }, { status: 404 }),
    ),
    delayed,
  ]);
  await new Promise((resolve) => setTimeout(resolve, 1));
  assert.equal(completed, false);
  finish();
  await assert.rejects(save, /Record removed/);
  assert.equal(completed, true);
  await assert.rejects(
    cms.checkCmsSaves([
      Promise.reject(Error("offline")),
      Promise.resolve(Response.json({})),
    ]),
    /connection/,
  );
  assert.equal(
    (await hero.PATCH(request({ heading: "Missing" }, "9", "PATCH"))).status,
    404,
  );
});

test("admin product endpoints reject malformed financial input before storing it", async () => {
  const body = {
    name: "Tea",
    description: "Tea description",
    category: "Matcha",
    price: 100,
    stockQuantity: 2,
  };
  for (const patch of [
    { price: -1 },
    { price: 0 },
    { price: 1.001 },
    { price: "100" },
    { stockQuantity: 1.5 },
    { stockQuantity: -1 },
    { name: "" },
  ]) {
    assert.equal(
      (await productAdmin.POST(request({ ...body, ...patch }, "9"))).status,
      400,
    );
    assert.equal(
      (
        await productEdit.PUT(
          request({ ...body, ...patch }, "9", "PUT"),
          params(1),
        )
      ).status,
      400,
    );
  }
  assert.equal((await productAdmin.POST(request(body, "9"))).status, 200);
  assert.equal(
    (
      await productEdit.PUT(
        request({ ...body, price: 150 }, "9", "PUT"),
        params(1),
      )
    ).status,
    200,
  );
});

test("verification resend reflects provider rejection and denies suspended accounts", async () => {
  const resend = load("app/api/resend-verification/route.ts");
  emailFailure = true;
  assert.equal((await resend.POST(request({}, "2"))).status, 500);
  emailFailure = false;
  assert.equal((await resend.POST(request({}, "2"))).status, 200);
  await db.exec("UPDATE users SET is_suspended=true WHERE user_id=2");
  assert.equal((await resend.POST(request({}, "2"))).status, 403);
});

test("suspended and deleted accounts cannot access contact or order history with stale tokens", async () => {
  const contacts = load("app/api/contact/route.ts"),
    message = load("app/api/contact/[id]/route.ts"),
    order = load("app/api/orders/[orderId]/route.ts");
  const orders = load("app/api/orders/route.ts");
  await db.exec("UPDATE users SET is_suspended=true WHERE user_id=2");
  for (const [user, status] of [
    ["2", 403],
    ["8", 401],
  ]) {
    assert.equal((await orders.GET(request(null, user, "GET"))).status, status);
    assert.equal(
      (await contacts.GET(request(null, user, "GET"))).status,
      status,
    );
    assert.equal(
      (
        await contacts.POST(
          request({ subject: "Question", message: "Message" }, user),
        )
      ).status,
      status,
    );
    assert.equal(
      (await message.GET(request(null, user, "GET"), params(1))).status,
      status,
    );
    assert.equal(
      (
        await order.GET(request(null, user, "GET"), {
          params: Promise.resolve({ orderId: "1" }),
        })
      ).status,
      status,
    );
  }
});
