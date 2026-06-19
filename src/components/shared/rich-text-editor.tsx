"use client";

import { useEffect } from "react";
import { useEditor, EditorContent, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Mark, mergeAttributes } from "@tiptap/core";
import { cn } from "@/lib/utils";

// ── Inline Underline Mark ────────────────────────────────────
const Underline = Mark.create({
  name: "underline",
  parseHTML() {
    return [{ tag: "u" }, { style: "text-decoration=underline" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["u", mergeAttributes(HTMLAttributes), 0];
  },
  addKeyboardShortcuts() {
    return {
      "Mod-u": () => this.editor.commands.toggleMark(this.name),
    };
  },
});

// ── Inline Highlight Mark ────────────────────────────────────
const Highlight = Mark.create({
  name: "highlight",
  parseHTML() {
    return [{ tag: "mark" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["mark", mergeAttributes(HTMLAttributes, { class: "iv-highlight" }), 0];
  },
});

// ── Toolbar Button ───────────────────────────────────────────
function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold transition-all cursor-pointer",
        active
          ? "bg-primary/20 text-primary border border-primary/40"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground border border-transparent"
      )}
    >
      {children}
    </button>
  );
}

// ── Divider ──────────────────────────────────────────────────
function Divider() {
  return <span className="w-px h-4 bg-border/60 mx-0.5 shrink-0" />;
}

// ── RichTextEditor Component ─────────────────────────────────
interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your answer here...",
  minHeight = "128px",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable code block from starter-kit (we keep code inline only)
        codeBlock: false,
      }),
      Underline,
      Highlight,
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "rich-text-content outline-none",
        style: `min-height: ${minHeight}; padding: 0.75rem 1rem;`,
      },
    },
    onUpdate({ editor }) {
      const html = editor.getHTML();
      // Treat empty paragraphs as empty string
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  // Sync external value changes (e.g. when editing an existing question)
  useEffect(() => {
    if (!editor) return;
    const currentHTML = editor.getHTML();
    if (currentHTML !== value && value !== undefined) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  return (
    <div className="rounded-xl border border-border bg-black/20 overflow-hidden focus-within:ring-1 focus-within:ring-primary focus-within:border-transparent transition-all">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border/60 bg-black/10 flex-wrap">
        {/* Text Style */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleMark("underline").run()}
          active={editor.isActive("underline")}
          title="Underline (Ctrl+U)"
        >
          <u>U</u>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleMark("highlight").run()}
          active={editor.isActive("highlight")}
          title="Highlight"
        >
          <span className="relative">
            <span className="text-yellow-400 text-[11px] font-extrabold">H</span>
          </span>
        </ToolbarButton>

        <Divider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="9" y1="6" x2="20" y2="6" />
            <line x1="9" y1="12" x2="20" y2="12" />
            <line x1="9" y1="18" x2="20" y2="18" />
            <circle cx="4" cy="6" r="1.5" fill="currentColor" />
            <circle cx="4" cy="12" r="1.5" fill="currentColor" />
            <circle cx="4" cy="18" r="1.5" fill="currentColor" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Numbered List"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="10" y1="6" x2="21" y2="6" />
            <line x1="10" y1="12" x2="21" y2="12" />
            <line x1="10" y1="18" x2="21" y2="18" />
            <text x="1" y="9" fontSize="7" fill="currentColor" stroke="none">1.</text>
            <text x="1" y="15" fontSize="7" fill="currentColor" stroke="none">2.</text>
            <text x="1" y="21" fontSize="7" fill="currentColor" stroke="none">3.</text>
          </svg>
        </ToolbarButton>

        <Divider />

        {/* Inline code */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive("code")}
          title="Inline Code"
        >
          <span className="font-mono text-[10px]">{`</>`}</span>
        </ToolbarButton>
      </div>

      {/* ── Editor Content ── */}
      <EditorContent editor={editor} />

      {/* ── Placeholder ── */}
      {editor.isEmpty && (
        <p className="absolute pointer-events-none text-sm text-muted-foreground/50 px-4 py-3 select-none" style={{ marginTop: `-${minHeight}` }}>
          {placeholder}
        </p>
      )}
    </div>
  );
}
