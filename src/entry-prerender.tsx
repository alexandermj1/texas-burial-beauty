// Build-time page renderer. scripts/prerender-plugin.ts bundles this file for
// Node and calls render() for every public route, then places the resulting
// HTML inside #root so search engines and AI readers that do not run
// JavaScript still receive each page's real content.
import { PassThrough } from "node:stream";
import type { ReactNode } from "react";
import { renderToPipeableStream } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { AppShell } from "./App";

export function render(pathname: string, timeoutMs = 8000): Promise<string> {
  return new Promise((resolve, reject) => {
    let failed: unknown = null;
    const Router = ({ children }: { children?: ReactNode }) => (
      <StaticRouter location={pathname}>{children}</StaticRouter>
    );
    const timer = setTimeout(() => {
      stream.abort();
      reject(new Error(`timed out rendering ${pathname}`));
    }, timeoutMs);
    const stream = renderToPipeableStream(<AppShell Router={Router} />, {
      onError(error) {
        failed = failed ?? error;
      },
      onShellError(error) {
        clearTimeout(timer);
        reject(error);
      },
      onAllReady() {
        clearTimeout(timer);
        if (failed) return reject(failed);
        const sink = new PassThrough();
        const chunks: Buffer[] = [];
        sink.on("data", (c: Buffer) => chunks.push(c));
        sink.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        sink.on("error", reject);
        stream.pipe(sink);
      },
    });
  });
}
