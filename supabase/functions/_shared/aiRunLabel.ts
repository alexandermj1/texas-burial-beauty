// Gives each AI gateway call a readable run name in the AI activity log.
// The log names a run from the start of the first user message, so we prefix it
// with a short plain-English label like "Seller AI — deciding next steps".
export function labelRun<T>(body: T, label: string): T {
  if (!label) return body;
  const tag = `[${label}]\n`;
  const b = body as any;
  const prefix = (c: any): any => {
    if (typeof c === "string") return tag + c;
    if (Array.isArray(c)) {
      const i = c.findIndex((p: any) => p && (p.type === "text" || p.type === "input_text") && typeof p.text === "string");
      if (i >= 0) { const copy = [...c]; copy[i] = { ...c[i], text: tag + c[i].text }; return copy; }
      return [{ type: c[0]?.type === "input_image" ? "input_text" : "text", text: tag }, ...c];
    }
    return c;
  };
  if (Array.isArray(b?.messages)) {
    const i = b.messages.findIndex((m: any) => m?.role === "user");
    if (i >= 0) { const m = [...b.messages]; m[i] = { ...m[i], content: prefix(m[i].content) }; return { ...b, messages: m }; }
  }
  if (typeof b?.input === "string") return { ...b, input: tag + b.input };
  if (Array.isArray(b?.input)) {
    const i = b.input.findIndex((m: any) => m?.role === "user");
    if (i >= 0) { const m = [...b.input]; m[i] = { ...m[i], content: prefix(m[i].content) }; return { ...b, input: m }; }
  }
  return body;
}

/** fetch() wrapper that labels a JSON gateway request body before sending. */
export function aiFetch(label: string, url: string, init: RequestInit & { body?: any }, f: typeof fetch = fetch) {
  let body = init.body;
  if (typeof body === "string") {
    try { body = JSON.stringify(labelRun(JSON.parse(body), label)); } catch { /* leave as is */ }
  }
  return f(url, { ...init, body });
}
