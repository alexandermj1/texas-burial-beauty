type InputContent = ({ type: "input_text"; text: string } | { type: "input_image"; image_url?: string | null } | { type: "input_file"; file_data?: string; filename?: string } )[];
type ClaudeContent = ({ type: "text"; text: string } | { type: "image"; source: { type: "base64"; media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp"; data: string } } | { type: "document"; title: string; source: { type: "base64"; media_type: "application/pdf"; data: string } })[];
export function claudeMedia(media: InputContent): ClaudeContent {
  return media.map(part => {
    if (part.type === "input_text") return { type: "text", text: part.text };
    if (part.type === "input_image" && part.image_url) {
      const match = part.image_url.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/s);
      if (!match) throw new Error("This scan format cannot be sent to Opus; use a JPEG, PNG, GIF or WebP scan.");
      const mime = match[1];
      if (mime !== "image/jpeg" && mime !== "image/png" && mime !== "image/gif" && mime !== "image/webp") throw new Error("Unsupported scan format");
      return { type: "image", source: { type: "base64", media_type: mime, data: match[2] } };
    }
    if (part.type === "input_file" && part.file_data) {
      const match = part.file_data.match(/^data:application\/pdf;base64,(.+)$/s);
      if (!match) throw new Error("This document cannot be sent to Opus; use a PDF scan.");
      return { type: "document", title: part.filename ?? "Scan", source: { type: "base64", media_type: "application/pdf", data: match[1] } };
    }
    throw new Error("Unsupported scan input; no model substitution was made.");
  });
}