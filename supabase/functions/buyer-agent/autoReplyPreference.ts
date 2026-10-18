export function buyerReplyAllowed(disabled: boolean | null | undefined, automatic: boolean) {
  return !automatic || disabled === false;
}
