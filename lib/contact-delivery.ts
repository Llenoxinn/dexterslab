/**
 * Contact form delivery through Web3Forms (https://web3forms.com).
 *
 * The access key is public by design: it can only send mail to the inbox it was created for.
 * Set NEXT_PUBLIC_WEB3FORMS_KEY in .env.local (and in Vercel). Without it, the form falls back
 * to opening the visitor's email app with a pre-filled draft.
 */

export const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";

/** Web3Forms' shared hCaptcha sitekey for free plans (docs: spam-protection/hcaptcha). Public by design. */
export const WEB3FORMS_HCAPTCHA_SITEKEY = "50b2fe65-b00b-4b9e-ad62-3ba471098be2";

export type ContactMessage = {
  name: string;
  email: string;
  subject: string;
  message: string;
  /** Honeypot: real people never fill this hidden field in. */
  botcheck?: string;
  /** Solved hCaptcha token; required when hCaptcha is enabled in the Web3Forms dashboard. */
  captchaToken?: string;
};

export function buildPayload(accessKey: string, input: ContactMessage) {
  const name = input.name.trim();
  const subject = input.subject.trim() || "Hello from your portfolio";
  return {
    access_key: accessKey,
    subject: `[Portfolio] ${subject} (${name})`,
    from_name: "dexterslab contact form",
    // Web3Forms sets Reply-To from `email`, so replying in your inbox goes straight to the visitor.
    name,
    email: input.email.trim(),
    message: input.message.trim(),
    botcheck: input.botcheck ?? "",
    ...(input.captchaToken ? { "h-captcha-response": input.captchaToken } : {}),
  };
}

export type DeliveryResult = { ok: true } | { ok: false; reason: "spam" | "rejected" | "network" };

export async function sendContactMessage(
  accessKey: string,
  input: ContactMessage,
  fetcher: typeof fetch = fetch,
): Promise<DeliveryResult> {
  // Bots that fill the honeypot get a quiet "success" and nothing is sent.
  if (input.botcheck) return { ok: false, reason: "spam" };
  try {
    const response = await fetcher(WEB3FORMS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(buildPayload(accessKey, input)),
    });
    const data = (await response.json().catch(() => null)) as { success?: boolean } | null;
    return response.ok && data?.success ? { ok: true } : { ok: false, reason: "rejected" };
  } catch {
    return { ok: false, reason: "network" };
  }
}

export function mailtoDraft(to: string, input: ContactMessage) {
  const subject = input.subject.trim() || "Hello from your portfolio";
  const name = input.name.trim() || "Visitor";
  const body = `${input.message.trim()}\n\n--\nFrom: ${name}\nReply-To: ${input.email.trim() || "not provided"}`;
  return `mailto:${to}?subject=${encodeURIComponent(`[Portfolio] ${subject} (${name})`)}&body=${encodeURIComponent(body)}`;
}
