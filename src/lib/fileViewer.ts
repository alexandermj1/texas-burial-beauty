export type FileViewerSource =
  | { bucket: "customer-files" | "cemetery-files" | "portal-uploads" | "contracts"; path: string; name?: string; mime?: string | null }
  | { url: string; name?: string; mime?: string | null };

/** Encodes the file source directly into the viewer URL (base64url) so links
 *  survive refreshes and restored tabs — no sessionStorage hand-off. */
export const encodeViewerSource = (source: FileViewerSource): string => {
  const json = JSON.stringify(source);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export const decodeViewerSource = (encoded: string): FileViewerSource | null => {
  try {
    const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as FileViewerSource;
  } catch {
    return null;
  }
};

export const openFileViewer = (source: FileViewerSource) => {
  const tab = window.open(`/file-viewer?f=${encodeViewerSource(source)}`, "_blank");
  return !!tab;
};
