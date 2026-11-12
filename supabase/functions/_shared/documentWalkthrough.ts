// Shared public film metadata for customer pages and email links.
export const DOCUMENT_WALKTHROUGH = {
  title: "Your cemetery property documents, explained",
  durationSeconds: 232,
  videoUrl: "https://www.texascemeterybrokers.com/__l5e/assets-v1/eeb165da-ceee-46c7-9821-917fd95f6611/tcb-documents-walkthrough-v2.mp4",
  coverUrl: "https://www.texascemeterybrokers.com/__l5e/assets-v1/65efd7a2-93dd-47de-ada4-59813858d80e/tcb-documents-walkthrough-first-item-cover.jpg",
  coverAlt: "Texas Cemetery Brokers document walkthrough showing a phone with your document checklist and the words: Start with the first item on your page",
} as const;

export function documentWalkthroughLink(packetUrl: string): string {
  const url = new URL(packetUrl);
  url.hash = "document-walkthrough";
  return url.toString();
}

const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// Email clients cannot reliably play MP4s inline: link the cover to the customer's player.
export function documentWalkthroughEmail(packetUrl: string): string {
  const link = escape(documentWalkthroughLink(packetUrl));
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td><a href="${link}" style="text-decoration:none;"><img src="${escape(DOCUMENT_WALKTHROUGH.coverUrl)}" alt="${escape(DOCUMENT_WALKTHROUGH.coverAlt)}" width="520" style="display:block;width:100%;max-width:520px;height:auto;border:0;border-radius:8px;" /></a></td></tr><tr><td style="padding:12px 0;font-size:15px;line-height:1.6;"><a href="${link}" style="color:#1f2a37;font-weight:bold;">▶ Watch your document walkthrough · 3 min 52 sec</a><br/><span style="font-size:13px;color:#4a5568;">Why we request documents, signing and notarising, uploads and mailing originals. Follow your own checklist below the film — not every example applies to your property.</span></td></tr></table>`;
}
