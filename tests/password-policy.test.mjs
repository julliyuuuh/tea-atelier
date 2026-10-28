import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import crypto from "node:crypto";

let queries = [], hashes = [];
function load(file) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    module, exports: module.exports, TextEncoder, Date, console,
    require(name) {
      if (name === "@/lib/password-policy") return load("lib/password-policy.ts");
      if (name === "@/lib/auth-rate-limit") return {
        limitAuthRequest: async () => null,
        limitAuthAccount: async () => null,
        normalizeAuthEmail: (value) => typeof value === "string" ? value.trim() : null,
      };
      if (name === "next/server") return { NextResponse: { json: Response.json } };
      if (name === "crypto") return { default: crypto };
      if (name === "@/lib/email") return { sendVerificationEmail: async () => {} };
      const hash = async (value) => { hashes.push(value); return "hashed"; };
      if (name === "bcrypt") return { default: { hash } };
      if (name === "@/lib/auth-server") return { hashPassword: hash, signToken: () => "token" };
      if (name === "@/lib/db") return { pool: { async query(sql, args) {
        queries.push({ sql, args });
        if (sql.includes("reset_token_expires")) return { rows: [{ user_id: 1, reset_token_expires: new Date(Date.now() + 60000) }] };
        if (sql.includes("INSERT")) return { rows: [{ user_id: 1, first_name: "Tea", last_name: "Buyer", email: "test@example.test", role: "customer" }] };
        return { rows: [] };
      } } };
      throw Error(name);
    },
  });
  return module.exports;
}
const signup = load("app/api/signup/route.ts");
const reset = load("app/api/reset-password/route.ts");
const request = (body) => new Request("https://example.test", { method: "POST", body: JSON.stringify(body) });

test("signup and reset reject weak, malformed and oversized passwords before database or hashing", async () => {
  for (const password of [null, 123456789012, {}, "Abc123", "Aa12345", "onlylowercase1", "ONLYUPPERCASE1", "NoNumbersHere", "Aa1" + "x".repeat(70), "Aa1" + "é".repeat(35)]) {
    queries = []; hashes = [];
    for (const response of [
      await signup.POST(request({ firstName: "Tea", lastName: "Buyer", email: "test@example.test", password })),
      await reset.POST(request({ token: "valid", newPassword: password })),
    ]) assert.equal(response.status, 400);
    assert.equal(queries.length, 0);
    assert.equal(hashes.length, 0);
  }
});

test("signup and reset accept valid passwords without changing spaces or unicode", async () => {
  for (const password of ["Aa123456", "TeaGarden123", "TeaGarden1234", "Aa1" + "x".repeat(69), "Aa1" + "é".repeat(34), " Tea garden 123 "]) {
    queries = []; hashes = [];
    const signupResponse = await signup.POST(request({ firstName: "Tea", lastName: "Buyer", email: "test@example.test", password }));
    assert.equal(signupResponse.status, password.length < 8 ? 400 : 200);
    if (password.length < 8) continue;
    assert.equal((await signupResponse.json()).user.isVerified, false);
    assert.equal((await reset.POST(request({ token: "valid", newPassword: password }))).status, 200);
    assert.deepEqual(hashes, [password, password]);
    assert.ok(queries.some(({ sql }) => sql.includes("reset_token_hash = NULL")));
  }
});
