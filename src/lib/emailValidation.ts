// Lightweight email validation. We can't reach out to an SMTP server from the
// browser to truly verify deliverability without a third-party API, so this
// focuses on strict format validation plus a few common-sense checks
// (typos in popular domains, disposable providers, obvious junk).

const EMAIL_REGEX =
  /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9](?:[A-Za-z0-9\-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9\-]{0,61}[A-Za-z0-9])?)+$/;

const COMMON_DOMAIN_TYPOS: Record<string, string> = {
  "gmail.co": "gmail.com",
  "gmial.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.con": "gmail.com",
  "yahooo.com": "yahoo.com",
  "yaho.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "hotnail.com": "hotmail.com",
  "hotmial.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "icloud.co": "icloud.com",
  "iclould.com": "icloud.com",
  "aol.co": "aol.com",
};

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "trashmail.com",
  "yopmail.com",
  "fakeinbox.com",
  "throwawaymail.com",
  "getnada.com",
  "sharklasers.com",
]);

export type EmailCheck =
  | { ok: true; normalized: string; suggestion?: string }
  | { ok: false; error: string; suggestion?: string };

export function validateEmail(raw: string): EmailCheck {
  const value = (raw || "").trim();
  if (!value) return { ok: false, error: "Please enter your email." };
  if (value.length > 254) return { ok: false, error: "That email is too long." };
  if (!EMAIL_REGEX.test(value)) {
    return { ok: false, error: "Please enter a valid email address (e.g. name@example.com)." };
  }

  const [local, domainRaw] = value.split("@");
  const domain = domainRaw.toLowerCase();

  if (local.length > 64) return { ok: false, error: "The part before @ is too long." };
  if (local.startsWith(".") || local.endsWith(".") || local.includes(".."))
    return { ok: false, error: "Please check the dots in your email address." };

  // TLD must be at least 2 letters and not be all digits.
  const tld = domain.split(".").pop() || "";
  if (tld.length < 2 || /^\d+$/.test(tld)) {
    return { ok: false, error: "That email's domain doesn't look right." };
  }

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      ok: false,
      error: "Please use a permanent email address so we can reach you.",
    };
  }

  const suggestedDomain = COMMON_DOMAIN_TYPOS[domain];
  if (suggestedDomain) {
    return {
      ok: false,
      error: `Did you mean ${local}@${suggestedDomain}?`,
      suggestion: `${local}@${suggestedDomain}`,
    };
  }

  return { ok: true, normalized: `${local}@${domain}` };
}
