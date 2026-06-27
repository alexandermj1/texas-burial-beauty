// Helpers for classifying email direction and "awaiting reply" status.
// Our outgoing sender addresses — anything from these counts as a reply we sent.
const OUR_ADDRESSES = [
  "info@texascemeterybrokers.com",
  "info@bayercemeterybrokers.com",
  "texascemeterybrokers@gmail.com",
];

const extractAddress = (raw: string | null | undefined): string => {
  if (!raw) return "";
  const m = raw.match(/<([^>]+)>/);
  return (m ? m[1] : raw).trim().toLowerCase();
};

export const isOutgoing = (from_email: string | null | undefined): boolean => {
  const addr = extractAddress(from_email);
  return OUR_ADDRESSES.some((o) => addr === o);
};

export const isIncoming = (from_email: string | null | undefined): boolean => {
  if (!from_email) return false;
  return !isOutgoing(from_email);
};
