"use client";

import HCaptcha from "@hcaptcha/react-hcaptcha";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useClipboard } from "@/lib/use-clipboard";
import { EnvelopeIcon, FacebookMark, GitHubMark, LinkedInMark } from "@/components/icons";
import { pixelPath } from "@/lib/pixel";
import {
  DEXTER_HIT,
  DEXTER_JUMP,
  DEXTER_WAVE_A,
  DEXTER_WAVE_B,
  GAME_FLASK,
  GAME_TUBES,
} from "@/lib/pixel-art";
import { WEB3FORMS_HCAPTCHA_SITEKEY, mailtoDraft, sendContactMessage } from "@/lib/contact-delivery";
import { site } from "@/lib/site";

const WEB3FORMS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_KEY ?? "";

const WAVE_W = DEXTER_WAVE_A[0].length;
const WAVE_H = DEXTER_WAVE_A.length;

const buildLayers = (art: readonly string[]) => ({
  D: pixelPath(art, "D"),
  L: pixelPath(art, "L"),
  N: pixelPath(art, "N"),
  P: pixelPath(art, "P"),
});

const WAVE_A = buildLayers(DEXTER_WAVE_A);
const WAVE_B = buildLayers(DEXTER_WAVE_B);
const JUMP_FRAME = buildLayers(DEXTER_JUMP);
const HIT_FRAME = buildLayers(DEXTER_HIT);
const FLASK_ART = buildLayers(GAME_FLASK);
const TUBES_ART = buildLayers(GAME_TUBES);
const FLASK_W = GAME_FLASK[0].length;
const FLASK_H = GAME_FLASK.length;
const TUBES_W = GAME_TUBES[0].length;
const TUBES_H = GAME_TUBES.length;

const SOCIAL_LINKS = [
  { label: "Email", href: `mailto:${site.email}`, handle: site.email, Icon: EnvelopeIcon, external: false },
  { label: "GitHub", href: site.github, handle: "@Llenoxinn", Icon: GitHubMark, external: true },
  { label: "LinkedIn", href: site.linkedin, handle: "in/dsjuevesano", Icon: LinkedInMark, external: true },
  { label: "Facebook", href: site.facebook, handle: "acetylsphaericus", Icon: FacebookMark, external: true },
] as const;

type FieldName = "name" | "email" | "message" | "captcha";
type FieldErrors = Partial<Record<FieldName, string>>;

// The form validates itself and answers in the voice of the site, not with the grey browser bubble.
function validate(name: string, email: string, message: string): FieldErrors {
  const found: FieldErrors = {};
  if (!name.trim()) found.name = "Who is writing? Add your name.";
  if (!email.trim()) found.email = "Add an email so I can reply.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) found.email = "That email looks off. Check it once more.";
  if (!message.trim()) found.message = "The message is empty. Write a line or two.";
  return found;
}

type ActiveField = "name" | "email" | "subject" | "message" | null;

const SOCIAL_BUBBLES: Record<string, string> = {
  Email: "Direct inbox. Fastest way to reach me.",
  GitHub: "Browse my repos and lab experiments!",
  LinkedIn: "Let's connect on LinkedIn!",
  Facebook: "Ping me on Messenger anytime.",
};

export function ContactSection() {
  const { status: copyStatus, copy } = useClipboard();
  const copied = copyStatus === "copied";
  const jumpTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => { clearTimeout(jumpTimer.current); clearTimeout(draftTimer.current); }, []);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  // idle → sending → sent | error. "draft" is the no-key fallback that opens the email app.
  const [sentState, setSentState] = useState<"idle" | "sending" | "sent" | "draft" | "error">("idle");
  const [botcheck, setBotcheck] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const captchaRef = useRef<HCaptcha>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [hoveredSocial, setHoveredSocial] = useState<string | null>(null);
  const [jumping, setJumping] = useState(false);
  // The section opens as just a heading and two choices; the form or the links appear on request.
  const [panel, setPanel] = useState<"message" | "links" | null>(null);
  const togglePanel = (next: "message" | "links") => {
    setPanel((prev) => (prev === next ? null : next));
    setCaptchaToken(""); // the captcha widget remounts with the form
  };

  const firstError = errors.name ?? errors.email ?? errors.message ?? errors.captcha;
  const clearError = (field: FieldName) =>
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const spriteMode: "error" | "jump" | "wave" = firstError
    ? "error"
    : sentState === "sent" || sentState === "draft" || jumping
      ? "jump"
      : "wave";

  const bubbleText = (() => {
    if (firstError) return firstError;
    if (sentState === "sending") return "Sending it over to my inbox…";
    if (sentState === "sent") return `Got it! I'll reply to ${email.trim()}.`;
    if (sentState === "draft") return "Draft ready. Send it from your email app.";
    if (sentState === "error") return "Hmm, that didn't go through. Try again?";
    if (copied) return "Email address copied to clipboard!";
    if (hoveredSocial && SOCIAL_BUBBLES[hoveredSocial]) return SOCIAL_BUBBLES[hoveredSocial];
    if (activeField === "name") return name.trim() ? `Nice to meet you, ${name.trim().split(" ")[0]}!` : "Who is writing? Add your name.";
    if (activeField === "email") return "Where should I send my reply?";
    if (activeField === "subject") return "Project, research, or CTF collab?";
    if (activeField === "message") return "Listening closely… tell me what we are building.";
    if (jumping) return "Lab systems online and ready!";
    return "In the lab. Say hi or drop a note!";
  })();

  const triggerJump = () => {
    if (jumping) return;
    setJumping(true);
    jumpTimer.current = setTimeout(() => setJumping(false), 650);
  };

  const handleCopy = () => copy(site.email);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const found = validate(name, email, message);
    if (WEB3FORMS_KEY && !captchaToken) found.captcha = "Tick the hCaptcha box so I know you're human.";
    setErrors(found);
    const firstInvalid = (["name", "email", "message"] as const).find((field) => found[field]);
    if (firstInvalid) {
      (form.elements.namedItem(firstInvalid) as HTMLElement | null)?.focus();
      return;
    }
    const input = { name, email, subject, message, botcheck, captchaToken };

    // No key configured (e.g. local dev): fall back to a pre-filled draft in the visitor's email app.
    if (!WEB3FORMS_KEY) {
      window.location.href = mailtoDraft(site.email, input);
      setSentState("draft");
      clearTimeout(draftTimer.current);
      draftTimer.current = setTimeout(() => setSentState("idle"), 4000);
      return;
    }

    setSentState("sending");
    const result = await sendContactMessage(WEB3FORMS_KEY, input);
    // hCaptcha tokens are single-use: always reset after a send attempt.
    captchaRef.current?.resetCaptcha();
    setCaptchaToken("");
    if (result.ok || result.reason === "spam") {
      setSentState("sent");
      clearTimeout(draftTimer.current);
      draftTimer.current = setTimeout(() => setSentState("idle"), 8000);
      setName("");
      setSubject("");
      setMessage("");
      return;
    }
    setSentState("error");
  };

  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="wrap lab-section contact-section"
    >
      <div className="contact-hero">
        <h2 id="contact-heading" className="section-title contact-hero-title">
          Get in touch
        </h2>
        <p className="section-intro">
          Have a project, an internship opening, or a CTF team that needs one more?
        </p>
        <div className="contact-hero-actions">
          <button
            type="button"
            className={`btn ${panel === "message" ? "btn-solid" : "btn-ghost"}`}
            aria-expanded={panel === "message"}
            aria-controls="contact-panel"
            onClick={() => togglePanel("message")}
          >
            Write me a message
          </button>
          <button
            type="button"
            className={`btn ${panel === "links" ? "btn-solid" : "btn-ghost"}`}
            aria-expanded={panel === "links"}
            aria-controls="contact-panel"
            onClick={() => togglePanel("links")}
          >
            Find me online
          </button>
        </div>
      </div>

      <div id="contact-panel" className={`contact-panel-area ${panel ? `is-${panel}` : ""}`}>
        {panel === "message" && (
        <form className="contact-form-card" onSubmit={handleSubmit} noValidate aria-busy={sentState === "sending"}>
          {/* Honeypot: hidden from people and assistive tech; bots tend to fill every field. */}
          <input
            type="text"
            name="botcheck"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="contact-honeypot"
            value={botcheck}
            onChange={(e) => setBotcheck(e.target.value)}
          />
          <div className="contact-form-row">
            <div className="contact-field">
              <label className="contact-field-label" htmlFor="contact-name">Your name</label>
              <input
                type="text"
                id="contact-name"
                name="name"
                required
                maxLength={120}
                autoComplete="name"
                value={name}
                onFocus={() => setActiveField("name")}
                onBlur={() => setActiveField((prev) => (prev === "name" ? null : prev))}
                onChange={(e) => {
                  setName(e.target.value);
                  clearError("name");
                }}
                placeholder="Your full name"
                className="contact-input"
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? "contact-error-name" : undefined}
              />
              {errors.name && (
                <span id="contact-error-name" className="contact-field-error" role="alert">
                  {errors.name}
                </span>
              )}
            </div>
            <div className="contact-field">
              <label className="contact-field-label" htmlFor="contact-email">Your email</label>
              <input
                type="email"
                id="contact-email"
                name="email"
                required
                maxLength={254}
                autoComplete="email"
                value={email}
                onFocus={() => setActiveField("email")}
                onBlur={() => setActiveField((prev) => (prev === "email" ? null : prev))}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError("email");
                }}
                placeholder="you@example.com"
                className="contact-input"
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? "contact-error-email" : undefined}
              />
              {errors.email && (
                <span id="contact-error-email" className="contact-field-error" role="alert">
                  {errors.email}
                </span>
              )}
            </div>
          </div>

          <div className="contact-field">
            <label className="contact-field-label" htmlFor="contact-subject">Subject</label>
            <input
              type="text"
              id="contact-subject"
              name="subject"
              maxLength={180}
              value={subject}
              onFocus={() => setActiveField("subject")}
              onBlur={() => setActiveField((prev) => (prev === "subject" ? null : prev))}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What is this about?"
              className="contact-input"
            />
          </div>

          <div className="contact-field contact-field--grow">
            <label className="contact-field-label" htmlFor="contact-message">Message</label>
            <textarea
              rows={5}
              id="contact-message"
              name="message"
              required
              maxLength={4000}
              value={message}
              onFocus={() => setActiveField("message")}
              onBlur={() => setActiveField((prev) => (prev === "message" ? null : prev))}
              onChange={(e) => {
                setMessage(e.target.value);
                clearError("message");
              }}
              placeholder="What are you working on, and where do I come in?"
              className="contact-input contact-textarea"
              aria-invalid={errors.message ? true : undefined}
              aria-describedby={errors.message ? "contact-error-message" : undefined}
            />
            {errors.message && (
              <span id="contact-error-message" className="contact-field-error" role="alert">
                {errors.message}
              </span>
            )}
          </div>

          {WEB3FORMS_KEY && (
            <div className="contact-captcha">
              <HCaptcha
                ref={captchaRef}
                sitekey={WEB3FORMS_HCAPTCHA_SITEKEY}
                reCaptchaCompat={false}
                onVerify={(token) => {
                  setCaptchaToken(token);
                  clearError("captcha");
                }}
                onExpire={() => setCaptchaToken("")}
              />
              {errors.captcha && (
                <span className="contact-field-error" role="alert">
                  {errors.captcha}
                </span>
              )}
            </div>
          )}

          <div className="contact-form-actions">
            <button
              type="submit"
              className={`contact-submit-btn ${sentState === "sent" || sentState === "draft" ? "is-sent" : ""}`}
              disabled={sentState === "sending"}
            >
              <span>
                {sentState === "sending" ? "Sending…" : sentState === "sent" ? "Sent" : sentState === "draft" ? "Draft ready" : "Send message"}
              </span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            </button>
            <p className={`contact-form-hint ${sentState === "error" ? "is-error" : ""}`} role="status">
              {sentState === "sent"
                ? "Message sent. I usually reply within a day or two."
                : sentState === "error"
                  ? <>It didn&apos;t send. Try again, or email me at <a href={`mailto:${site.email}`}>{site.email}</a>.</>
                  : sentState === "draft"
                    ? "Send the draft from your email app. If it did not open, email me directly."
                    : WEB3FORMS_KEY
                      ? "Goes straight to my inbox."
                      : "Opens your email app with this message filled in."}
            </p>
          </div>
        </form>
        )}

        {panel === "links" && (
        <aside className="contact-side-stack" aria-label="Direct contact channels">
          <div className="contact-channel-block">
            <button
              type="button"
              onClick={handleCopy}
              className="contact-email-card"
              aria-label={`Copy email address ${site.email}`}
            >
              <span className="contact-email-card-value">{site.email}</span>
              <span className="contact-email-card-meta">
                <span>Cebu, Philippines (UTC+8)</span>
                <span className="contact-email-card-badge">
                  {copied ? "Copied" : copyStatus === "error" ? "Copy failed" : "Copy"}
                </span>
              </span>
            </button>
            <p className="sr-only" role="status">{copied ? "Email address copied." : copyStatus === "error" ? `Copy failed. Email ${site.email} directly.` : ""}</p>

            <div className="socials contact-socials-grid">
              {SOCIAL_LINKS.map(({ label, href, handle, Icon, external }) => (
                <a
                  key={label}
                  href={href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noreferrer noopener" : undefined}
                  aria-label={label}
                  data-tooltip={`${label}: ${handle}`}
                  className="social"
                  onMouseEnter={() => setHoveredSocial(label)}
                  onMouseLeave={() => setHoveredSocial((prev) => (prev === label ? null : prev))}
                  onFocus={() => setHoveredSocial(label)}
                  onBlur={() => setHoveredSocial((prev) => (prev === label ? null : prev))}
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          <div
            className={`contact-dexter-stage contact-dexter is-${spriteMode}`}
            onClick={triggerJump}
            aria-hidden="true"
          >
            <div className="contact-stage-viewport">
              <div
                key={bubbleText}
                className={`contact-dexter-bubble ${firstError ? "is-error" : ""} ${
                  sentState === "sent" || sentState === "draft" || copied ? "is-success" : ""
                }`}
              >
                {bubbleText}
              </div>

              <div className="contact-bench-scene">
                <svg
                  className="contact-prop contact-prop--tubes"
                  viewBox={`0 0 ${TUBES_W} ${TUBES_H}`}
                  shapeRendering="crispEdges"
                >
                  <path d={TUBES_ART.L} fill="#cbcbef" />
                  <path d={TUBES_ART.N} fill="#6666fd" />
                  <path d={TUBES_ART.P} fill="#f6f6fc" />
                </svg>

                <svg
                  className={`contact-dexter-sprite ${jumping ? "is-jumping" : ""}`}
                  viewBox={`0 0 ${WAVE_W} ${WAVE_H}`}
                  shapeRendering="crispEdges"
                >
                  {spriteMode === "error" ? (
                    <g className="dexter-frame">
                      <path d={HIT_FRAME.D} fill="#0a0a5d" />
                      <path d={HIT_FRAME.L} fill="#cbcbef" />
                      <path d={HIT_FRAME.N} fill="#6666fd" />
                      <path d={HIT_FRAME.P} fill="#f6f6fc" />
                    </g>
                  ) : spriteMode === "jump" ? (
                    <g className="dexter-frame">
                      <path d={JUMP_FRAME.D} fill="#0a0a5d" />
                      <path d={JUMP_FRAME.L} fill="#cbcbef" />
                      <path d={JUMP_FRAME.N} fill="#6666fd" />
                      <path d={JUMP_FRAME.P} fill="#f6f6fc" />
                    </g>
                  ) : (
                    <>
                      <g className="dexter-frame dexter-frame--a">
                        <path d={WAVE_A.D} fill="#0a0a5d" />
                        <path d={WAVE_A.L} fill="#cbcbef" />
                        <path d={WAVE_A.N} fill="#6666fd" />
                        <path d={WAVE_A.P} fill="#f6f6fc" />
                      </g>
                      <g className="dexter-frame dexter-frame--b">
                        <path d={WAVE_B.D} fill="#0a0a5d" />
                        <path d={WAVE_B.L} fill="#cbcbef" />
                        <path d={WAVE_B.N} fill="#6666fd" />
                        <path d={WAVE_B.P} fill="#f6f6fc" />
                      </g>
                    </>
                  )}
                </svg>

                <div className="contact-flask-wrap">
                  <span className="contact-flask-bubble contact-flask-bubble--1" />
                  <span className="contact-flask-bubble contact-flask-bubble--2" />
                  <span className="contact-flask-bubble contact-flask-bubble--3" />
                  <svg
                    className="contact-prop contact-prop--flask"
                    viewBox={`0 0 ${FLASK_W} ${FLASK_H}`}
                    shapeRendering="crispEdges"
                  >
                    <path d={FLASK_ART.L} fill="#cbcbef" />
                    <path d={FLASK_ART.N} fill="#6666fd" />
                    <path d={FLASK_ART.P} fill="#f6f6fc" />
                  </svg>
                </div>
              </div>

              <div className="contact-bench-floor" />
            </div>

          </div>
        </aside>
        )}
      </div>
    </section>
  );
}
