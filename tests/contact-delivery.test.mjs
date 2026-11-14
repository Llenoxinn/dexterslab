import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPayload, mailtoDraft, sendContactMessage } from "../lib/contact-delivery.ts";

const input = { name: " Ana ", email: " ana@example.com ", subject: "", message: " Hi! " };

test("payload trims fields, tags the subject and keeps the visitor's email for Reply-To", () => {
  const payload = buildPayload("key", input);
  assert.equal(payload.access_key, "key");
  assert.equal(payload.subject, "[Portfolio] Hello from your portfolio (Ana)");
  assert.equal(payload.email, "ana@example.com");
  assert.equal(payload.message, "Hi!");
});

test("delivery reports success, rejection, network failure and swallows honeypot spam", async () => {
  const reply = (ok, body) => async () => ({ ok, json: async () => body });
  assert.deepEqual(await sendContactMessage("k", input, reply(true, { success: true })), { ok: true });
  assert.deepEqual(await sendContactMessage("k", input, reply(true, { success: false })), { ok: false, reason: "rejected" });
  assert.deepEqual(await sendContactMessage("k", input, async () => { throw new Error("offline"); }), { ok: false, reason: "network" });
  let called = false;
  const spy = async () => { called = true; return { ok: true, json: async () => ({ success: true }) }; };
  assert.deepEqual(await sendContactMessage("k", { ...input, botcheck: "x" }, spy), { ok: false, reason: "spam" });
  assert.equal(called, false);
});

test("mailto fallback encodes the draft", () => {
  assert.match(mailtoDraft("me@x.com", input), /^mailto:me@x\.com\?subject=%5BPortfolio%5D/);
});

test("a solved hCaptcha token travels as h-captcha-response, and is omitted when absent", () => {
  assert.equal(buildPayload("k", { ...input, captchaToken: "tok" })["h-captcha-response"], "tok");
  assert.equal("h-captcha-response" in buildPayload("k", input), false);
});
