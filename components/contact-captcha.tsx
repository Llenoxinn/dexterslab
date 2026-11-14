"use client";

import HCaptcha, { type HCaptchaProps } from "@hcaptcha/react-hcaptcha";
import type { Ref } from "react";

export default function ContactCaptcha({ captchaRef, ...props }: HCaptchaProps & { captchaRef: Ref<HCaptcha> }) {
  return <HCaptcha {...props} ref={captchaRef} />;
}
