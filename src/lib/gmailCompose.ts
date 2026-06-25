// Build a Gmail compose URL that opens in the info@texascemeterybrokers.com account.
// Using authuser=<email> ensures Gmail switches to (or prompts sign-in for) that account
// rather than the default browser account.
const SENDER = "info@texascemeterybrokers.com";

export interface GmailComposeOptions {
  to: string;
  subject?: string;
  body?: string;
  cc?: string;
  bcc?: string;
}

export const buildGmailComposeUrl = ({ to, subject, body, cc, bcc }: GmailComposeOptions): string => {
  const params = new URLSearchParams();
  params.set("view", "cm");
  params.set("fs", "1");
  params.set("to", to);
  params.set("authuser", SENDER);
  if (subject) params.set("su", subject);
  if (body) params.set("body", body);
  if (cc) params.set("cc", cc);
  if (bcc) params.set("bcc", bcc);
  return `https://mail.google.com/mail/?${params.toString()}`;
};

export const openGmailCompose = (opts: GmailComposeOptions) => {
  window.open(buildGmailComposeUrl(opts), "_blank", "noopener,noreferrer");
};
