export type FileViewerSource =
  | { bucket: "customer-files" | "cemetery-files" | "portal-uploads" | "contracts"; path: string; name?: string; mime?: string | null }
  | { url: string; name?: string; mime?: string | null };

export const openFileViewer = (source: FileViewerSource) => {
  const id = crypto.randomUUID();
  sessionStorage.setItem(`file-viewer:${id}`, JSON.stringify(source));
  const tab = window.open(`/file-viewer?id=${encodeURIComponent(id)}`, "_blank");
  return !!tab;
};