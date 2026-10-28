import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync("lib/auth-response.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { module, exports: module.exports });
const { readAuthResponse } = module.exports;
const fallback = "Unable to sign in. Please try again shortly.";

test("HTML throttling pages become useful retry errors, with or without Retry-After", async () => {
  await assert.rejects(readAuthResponse(new Response("<!doctype html><title>Blocked</title>", {
    status: 429, headers: { "Retry-After": "120", "Content-Type": "text/html" },
  }), fallback), /Too many attempts.*2 minute/);
  await assert.rejects(readAuthResponse(new Response("<!doctype html>", { status: 429 }), fallback), /Too many attempts.*wait a few minutes/);
});
test("JSON rate-limit and invalid-password messages are preserved", async () => {
  for (const [status, error] of [[429, "Too many attempts. Please try again in 12 minute(s)."], [401, "Invalid email or password."]]) {
    await assert.rejects(readAuthResponse(Response.json({ error }, { status }), fallback), { message: error });
  }
});
test("HTML security challenges, hosting failures and malformed success bodies never expose parser errors", async () => {
  await assert.rejects(readAuthResponse(new Response("<!doctype html>", { status: 403 }), fallback), /security check/);
  for (const status of [200, 502, 503]) await assert.rejects(readAuthResponse(new Response("<!doctype html>", { status }), fallback), { message: fallback });
  for (const value of [null, [], {}, { token: "x" }]) await assert.rejects(readAuthResponse(Response.json(value), fallback), { message: fallback });
});
test("successful logins and TOTP challenges retain their original response data", async () => {
  for (const value of [{ token: "test-token", user: { role: "admin" } }, { requiresTotp: true }]) {
    assert.deepEqual(await readAuthResponse(Response.json(value), fallback), value);
  }
});
test("customer, admin and Google login callers use the safe reader", () => {
  for (const path of ["app/login/page.tsx", "app/admin/login/page.tsx"]) {
    const source = fs.readFileSync(path, "utf8");
    assert.ok(source.includes("await readAuthResponse(res,"));
    assert.ok(!source.includes("await res.json()"));
  }
});
