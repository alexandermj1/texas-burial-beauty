// Lightweight contentEditable rich-text editor with a Gmail-style toolbar.
// Emits HTML via onChange. Use ref's setHtml() to programmatically set content
// without breaking the user's caret.
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Bold, Italic, Underline, List, ListOrdered, Link as LinkIcon, Strikethrough, Eraser } from "lucide-react";

export interface RichTextEditorHandle {
  setHtml: (html: string) => void;
  getHtml: () => string;
  focus: () => void;
  /** Append HTML to the end of the editor content. */
  appendHtml: (html: string) => void;
  /**
   * Insert HTML just above the signature block (paragraph starting with
   * "Best regards", "Warm regards", "Kind regards", "Sincerely", "Thanks",
   * etc.). Falls back to appending at the end if no signature is detected.
   */
  insertHtmlBeforeSignature: (html: string) => void;
}

interface Props {
  initialHtml?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const exec = (cmd: string, value?: string) => {
  // execCommand is deprecated but still the simplest cross-browser
  // contentEditable formatting primitive and works in all modern browsers.
  document.execCommand(cmd, false, value);
};

const ToolbarButton = ({
  onMouseDown,
  title,
  children,
}: { onMouseDown: (e: React.MouseEvent) => void; title: string; children: React.ReactNode }) => (
  <button
    type="button"
    title={title}
    onMouseDown={(e) => { e.preventDefault(); onMouseDown(e); }}
    className="inline-flex items-center justify-center w-7 h-7 rounded text-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
  >
    {children}
  </button>
);

const RichTextEditor = forwardRef<RichTextEditorHandle, Props>(function RichTextEditor(
  { initialHtml = "", onChange, placeholder, minHeight = 180 },
  ref,
) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const lastHtmlRef = useRef<string>(initialHtml);

  useImperativeHandle(ref, () => ({
    setHtml: (html: string) => {
      if (elRef.current) {
        elRef.current.innerHTML = html;
        lastHtmlRef.current = html;
        onChange?.(html);
      }
    },
    getHtml: () => elRef.current?.innerHTML ?? "",
    focus: () => elRef.current?.focus(),
    appendHtml: (html: string) => {
      if (!elRef.current) return;
      elRef.current.innerHTML = (elRef.current.innerHTML || "") + html;
      lastHtmlRef.current = elRef.current.innerHTML;
      onChange?.(lastHtmlRef.current);
    },
    insertHtmlBeforeSignature: (html: string) => {
      const el = elRef.current;
      if (!el) return;
      const SIG_RE = /\b(best regards|warm regards|kind regards|sincerely|thank(s| you)|cheers|regards)\b/i;
      const blocks = Array.from(el.children) as HTMLElement[];
      const sigIdx = blocks.findIndex((b) => SIG_RE.test(b.textContent || ""));
      const wrap = document.createElement("div");
      wrap.innerHTML = html;
      const frag = document.createDocumentFragment();
      while (wrap.firstChild) frag.appendChild(wrap.firstChild);
      if (sigIdx >= 0) {
        el.insertBefore(frag, blocks[sigIdx]);
      } else {
        el.appendChild(frag);
      }
      lastHtmlRef.current = el.innerHTML;
      onChange?.(lastHtmlRef.current);
    },
  }));

  useEffect(() => {
    if (elRef.current && elRef.current.innerHTML !== initialHtml) {
      elRef.current.innerHTML = initialHtml;
      lastHtmlRef.current = initialHtml;
    }
    // We intentionally only sync when initialHtml reference changes from parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialHtml]);

  const handleInput = () => {
    const html = elRef.current?.innerHTML ?? "";
    lastHtmlRef.current = html;
    onChange?.(html);
  };

  const cmd = (c: string, value?: string) => {
    elRef.current?.focus();
    exec(c, value);
    handleInput();
  };

  const insertLink = () => {
    const url = window.prompt("Link URL");
    if (!url) return;
    cmd("createLink", url);
  };

  return (
    <div className="rounded border border-border bg-background focus-within:ring-1 focus-within:ring-primary">
      <div className="flex flex-wrap items-center gap-0.5 px-1.5 py-1 border-b border-border bg-muted/40 rounded-t">
        <ToolbarButton title="Bold (⌘B)" onMouseDown={() => cmd("bold")}>
          <Bold className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Italic (⌘I)" onMouseDown={() => cmd("italic")}>
          <Italic className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Underline (⌘U)" onMouseDown={() => cmd("underline")}>
          <Underline className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Strikethrough" onMouseDown={() => cmd("strikeThrough")}>
          <Strikethrough className="w-3.5 h-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarButton title="Bulleted list" onMouseDown={() => cmd("insertUnorderedList")}>
          <List className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Numbered list" onMouseDown={() => cmd("insertOrderedList")}>
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarButton title="Insert link" onMouseDown={insertLink}>
          <LinkIcon className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Clear formatting" onMouseDown={() => cmd("removeFormat")}>
          <Eraser className="w-3.5 h-3.5" />
        </ToolbarButton>
      </div>
      <div
        ref={elRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleInput}
        data-placeholder={placeholder}
        className="text-xs px-2.5 py-2 focus:outline-none whitespace-pre-wrap leading-relaxed [&_p]:my-4 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-4 [&_a]:text-primary [&_a]:underline empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground"
        style={{ minHeight }}
      />
    </div>
  );
});

export default RichTextEditor;
