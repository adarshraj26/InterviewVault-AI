"use client";

import { useMemo, useState, useCallback } from "react";
import { marked, Marked } from "marked";
import {
  Code2, Copy, Check,
  Info, AlertCircle, Lightbulb, AlertTriangle,
  CheckCircle2, XCircle, HelpCircle, ChevronDown,
  Zap, BookOpen, Star,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ═══════════════════════════════════════════════════════════
   MarkdownRenderer — Premium Notion/GitBook-style renderer
   ═══════════════════════════════════════════════════════════ */

// ── Language display names ──────────────────────────────────
const LANG_NAMES: Record<string, string> = {
  javascript: "JavaScript", js: "JavaScript",
  typescript: "TypeScript", ts: "TypeScript",
  python: "Python", py: "Python",
  java: "Java",
  cpp: "C++", "c++": "C++", c: "C",
  csharp: "C#", "c#": "C#",
  go: "Go", rust: "Rust", ruby: "Ruby", php: "PHP",
  swift: "Swift", kotlin: "Kotlin", dart: "Dart",
  sql: "SQL", html: "HTML", css: "CSS", scss: "SCSS", sass: "Sass",
  json: "JSON", yaml: "YAML", xml: "XML",
  bash: "Bash", shell: "Shell", sh: "Shell", powershell: "PowerShell",
  dockerfile: "Dockerfile", graphql: "GraphQL",
  markdown: "Markdown", md: "Markdown",
  text: "Text", txt: "Text", plaintext: "Plain Text",
  jsx: "JSX", tsx: "TSX", vue: "Vue", svelte: "Svelte",
  r: "R", scala: "Scala", elixir: "Elixir", lua: "Lua", perl: "Perl",
};

// ── Syntax Highlighting ─────────────────────────────────────
function highlightSyntax(code: string, language: string): string {
  if (!code) return "";

  let lang = (language || "").toLowerCase().trim();
  if (lang === "js") lang = "javascript";
  if (lang === "ts") lang = "typescript";
  if (lang === "py") lang = "python";
  if (lang === "c++") lang = "cpp";
  if (lang === "c#") lang = "csharp";
  if (lang === "sh") lang = "bash";

  const escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const highlightable = [
    "javascript", "typescript", "python", "java", "cpp", "csharp",
    "go", "rust", "ruby", "php", "swift", "kotlin", "dart",
    "html", "css", "sql", "bash", "jsx", "tsx",
  ];

  if (!highlightable.includes(lang)) return escaped;

  if (lang === "html" || lang === "jsx" || lang === "tsx") {
    return escaped.replace(
      /(&lt;!--.*?--&gt;)|(&lt;\/?[a-zA-Z0-9:-]+)|(\s[a-zA-Z0-9:-]+=)|(".*?"|'.*?')/g,
      (match, comment, tag, attr, val) => {
        if (comment) return `<span class="token-comment">${match}</span>`;
        if (tag) return match.replace(/(&lt;\/?)([\S]*)/, '$1<span class="token-tag">$2</span>');
        if (attr) return match.replace(/(\s)([^\s=]*)(\s*=)/, '$1<span class="token-attr-name">$2</span>$3');
        if (val) return `<span class="token-attr-value">${match}</span>`;
        return match;
      }
    );
  }

  if (lang === "css" || lang === "scss") {
    return escaped.replace(
      /(\/\*[\s\S]*?\*\/)|([a-zA-Z0-9_-]+)(?=\s*:(?!:))|(:\s*)([^;{]+)(;)/g,
      (match, comment, prop, colonSpace, val, semi) => {
        if (comment) return `<span class="token-comment">${match}</span>`;
        if (prop) return `<span class="token-property">${match}</span>`;
        if (colonSpace !== undefined) return `${colonSpace}<span class="token-string">${val}</span>${semi}`;
        return match;
      }
    );
  }

  if (lang === "sql") {
    return escaped.replace(
      /(--.*)|(\".*?\"|'.*?')|(\b\d+\b)|\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|FULL|CROSS|ON|AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|DROP|ALTER|INDEX|VIEW|TRIGGER|FUNCTION|PROCEDURE|BEGIN|END|IF|THEN|ELSE|CASE|WHEN|GROUP|BY|ORDER|ASC|DESC|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|AS|NULL|IS|DEFAULT|PRIMARY|KEY|FOREIGN|REFERENCES|CONSTRAINT|CHECK|UNIQUE|COUNT|SUM|AVG|MIN|MAX|COALESCE|CAST|CONVERT|DECLARE|RETURN|RETURNS)\b/gi,
      (match, comment, str, num, kw) => {
        if (comment) return `<span class="token-comment">${match}</span>`;
        if (str) return `<span class="token-string">${match}</span>`;
        if (num) return `<span class="token-number">${match}</span>`;
        if (kw) return `<span class="token-keyword">${match.toUpperCase()}</span>`;
        return match;
      }
    );
  }

  if (lang === "bash" || lang === "shell") {
    return escaped.replace(
      /(#.*)|(['"])([^\s]*?)\2|(\$\w+)|\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|exit|echo|cd|ls|mkdir|rm|cp|mv|cat|grep|sed|awk|sudo|apt|yum|brew|npm|npx|yarn|pnpm|pip|git|docker|kubectl)\b/g,
      (match, comment, q, _s, variable, kw) => {
        if (comment) return `<span class="token-comment">${match}</span>`;
        if (q) return `<span class="token-string">${match}</span>`;
        if (variable) return `<span class="token-variable">${match}</span>`;
        if (kw) return `<span class="token-keyword">${match}</span>`;
        return match;
      }
    );
  }

  const keywords: Record<string, string> = {
    javascript: "function|const|let|var|return|class|import|export|from|default|if|else|for|while|do|switch|case|break|continue|new|this|try|catch|finally|throw|async|await|yield|typeof|instanceof|in|of|delete|void|null|undefined|true|false|NaN|Infinity|super|extends|static|get|set|constructor",
    typescript: "function|const|let|var|return|class|import|export|from|default|if|else|for|while|do|switch|case|break|continue|new|this|try|catch|finally|throw|async|await|yield|typeof|instanceof|in|of|delete|void|null|undefined|true|false|NaN|Infinity|super|extends|static|get|set|constructor|interface|type|enum|namespace|declare|as|is|keyof|readonly|abstract|implements|private|protected|public|override|satisfies|infer|never|unknown|any",
    python: "def|class|return|if|elif|else|for|while|break|continue|pass|import|from|as|try|except|finally|raise|with|yield|lambda|global|nonlocal|assert|del|True|False|None|and|or|not|in|is|async|await|self|print",
    java: "public|private|protected|static|final|abstract|class|interface|extends|implements|return|if|else|for|while|do|switch|case|break|continue|new|this|try|catch|finally|throw|throws|import|package|void|int|long|float|double|boolean|char|byte|short|String|null|true|false|super|instanceof|enum|synchronized|volatile|transient|native",
    go: "func|package|import|return|if|else|for|range|switch|case|break|continue|go|defer|select|chan|map|struct|interface|type|const|var|nil|true|false|error|string|int|int64|float64|bool|byte|rune|make|new|append|len|cap|delete|copy|close|panic|recover",
    rust: "fn|let|mut|const|static|return|if|else|for|while|loop|match|break|continue|use|mod|pub|crate|super|self|struct|enum|impl|trait|type|where|async|await|move|ref|as|in|true|false|None|Some|Ok|Err|String|Vec|Box|Rc|Arc|Option|Result",
    ruby: "def|class|module|end|return|if|elsif|else|unless|for|while|until|do|begin|rescue|ensure|raise|require|include|extend|attr_accessor|attr_reader|attr_writer|self|super|nil|true|false|yield|block_given|puts|print|lambda|proc",
    php: "function|class|return|if|elseif|else|for|foreach|while|do|switch|case|break|continue|new|this|try|catch|finally|throw|use|namespace|public|private|protected|static|abstract|interface|extends|implements|echo|print|require|include|null|true|false|array|string|int|float|bool|void|self|parent",
    swift: "func|class|struct|enum|protocol|extension|return|if|else|for|while|repeat|switch|case|break|continue|guard|defer|throw|throws|try|catch|import|let|var|nil|true|false|self|super|init|deinit|is|as|in|inout|typealias|associatedtype|public|private|fileprivate|internal|open|static|override|mutating|lazy|weak|unowned|optional|some|any",
    kotlin: "fun|class|object|interface|return|if|else|for|while|when|break|continue|try|catch|finally|throw|import|package|val|var|null|true|false|this|super|is|as|in|typealias|companion|data|sealed|enum|abstract|open|override|private|protected|public|internal|suspend|inline|crossinline|noinline|reified|out|vararg|lateinit|lazy|by",
    dart: "void|int|double|String|bool|var|final|const|class|abstract|extends|implements|mixin|with|return|if|else|for|while|do|switch|case|break|continue|new|this|super|try|catch|finally|throw|rethrow|import|export|library|part|async|await|yield|true|false|null|dynamic|late|required|factory|get|set|operator|static|typedef|enum",
    csharp: "public|private|protected|internal|static|readonly|const|class|struct|interface|enum|abstract|sealed|override|virtual|new|return|if|else|for|foreach|while|do|switch|case|break|continue|try|catch|finally|throw|using|namespace|void|int|long|float|double|decimal|bool|char|string|object|var|null|true|false|this|base|async|await|yield|typeof|sizeof|is|as|in|out|ref|params",
    cpp: "int|long|float|double|char|bool|void|auto|const|static|extern|inline|virtual|override|class|struct|enum|union|namespace|using|return|if|else|for|while|do|switch|case|break|continue|new|delete|this|try|catch|throw|public|private|protected|template|typename|typedef|true|false|nullptr|sizeof|decltype|constexpr|noexcept|final|explicit|friend|operator|include|define|ifdef|ifndef|endif",
  };

  const kwPattern = keywords[lang] || keywords.javascript;
  const regex = new RegExp(
    `(\\/\\/.*|\\/\\*[\\s\\S]*?\\*\\/|#.*$)|(["\`'])([\\s\\S]*?)\\2|(\\b(?:${kwPattern})\\b)|(\\b\\d+(?:\\.\\d+)?\\b)|(\\b\\w+)(?=\\s*\\()`,
    "gm"
  );

  return escaped.replace(regex, (match, comment, quote, _strContent, keyword, number, func) => {
    if (comment) return `<span class="token-comment">${match}</span>`;
    if (quote) return `<span class="token-string">${match}</span>`;
    if (keyword) return `<span class="token-keyword">${match}</span>`;
    if (number) return `<span class="token-number">${match}</span>`;
    if (func) return `<span class="token-function">${match}</span>`;
    return match;
  });
}

// ── TOC extraction ──────────────────────────────────────────
export interface TocEntry {
  id: string;
  text: string;
  level: number;
}

export function extractToc(content: string): TocEntry[] {
  const toc: TocEntry[] = [];
  const usedIds = new Set<string>();
  
  // Match Markdown # Heading or HTML <h2>Heading</h2>
  const regex = /^(#{1,4})\s+(.+)$|<h([1234])[^>]*>(.*?)<\/h\3>/gmi;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const isMarkdown = !!match[1];
    const level = isMarkdown ? match[1].length : parseInt(match[3], 10);
    const rawText = isMarkdown ? match[2] : match[4];
    
    const text = rawText.replace(/<[^>]+>/g, "").replace(/[*_`~\[\]]/g, "").trim();

    let baseId = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-") || "heading";

    let id = baseId;
    let counter = 1;
    while (usedIds.has(id)) id = `${baseId}-${counter++}`;
    usedIds.add(id);

    toc.push({ id, text, level });
  }

  return toc;
}

// ── Detect if content is markdown ───────────────────────────
export function isMarkdownContent(str: string): boolean {
  if (!str) return false;
  const markdownPatterns = [
    /^#{1,6}\s+/m,
    /^```/m,
    /^>\s+/m,
    /^\s*[-*+]\s+/m,
    /^\s*\d+\.\s+/m,
    /\*\*[^*]+\*\*/,
    /`[^`]+`/,
    /\[.+\]\(.+\)/,
  ];
  let matchCount = 0;
  for (const pattern of markdownPatterns) {
    if (pattern.test(str)) matchCount++;
  }
  return matchCount >= 2;
}

// ════════════════════════════════════════════════════════════
//  DIRECTIVE / CUSTOM SYNTAX PREPROCESSING
// ════════════════════════════════════════════════════════════

/** Map of directive type keyword → CSS class + icon name */
const DIRECTIVE_MAP: Record<string, { cls: string; label: string; icon: string }> = {
  definition:           { cls: "md-callout-definition",    label: "Definition",          icon: "info" },
  info:                 { cls: "md-callout-info",           label: "Info",                icon: "info" },
  important:            { cls: "md-callout-important",      label: "Important",           icon: "alert-circle" },
  tip:                  { cls: "md-callout-tip",            label: "Interview Tip",       icon: "lightbulb" },
  "interview-tip":      { cls: "md-callout-tip",            label: "Interview Tip",       icon: "lightbulb" },
  warning:              { cls: "md-callout-warning",        label: "Warning",             icon: "alert-triangle" },
  example:              { cls: "md-callout-example",        label: "Example",             icon: "check-circle" },
  "best-practice":      { cls: "md-callout-best-practice",  label: "Best Practice",       icon: "star" },
  "common-mistake":     { cls: "md-callout-mistake",        label: "Common Mistake",      icon: "x-circle" },
  question:             { cls: "md-callout-question",       label: "Interview Question",  icon: "help-circle" },
  "interview-question": { cls: "md-callout-question",       label: "Interview Question",  icon: "help-circle" },
  followup:             { cls: "md-callout-followup",       label: "Follow-up Questions", icon: "zap" },
  "follow-up":          { cls: "md-callout-followup",       label: "Follow-up Questions", icon: "zap" },
  summary:              { cls: "md-callout-summary",        label: "Summary",             icon: "book-open" },
};

// Shared store for callout data — keyed by placeholder index
// This avoids any browser/Node Buffer API difference
let _calloutStore: Array<{ icon: string; label: string; body: string; cls: string }> = [];

const CODE_PLACEHOLDER = "IVAULTCODEBLOCK";
const CALLOUT_PLACEHOLDER = "IVAULTCALLOUT";

/** Pre-process the raw markdown text, populating _calloutStore */
function preprocessMarkdown(raw: string, calloutStore: typeof _calloutStore): string {
  let text = raw;

  // 1. ==highlight== → <mark class="md-highlight">text</mark>
  text = text.replace(/==([^=]+)==/g, '<mark class="md-highlight">$1</mark>');

  // 2. Frequency badge (standalone line)
  text = text.replace(
    /^Frequency:\s*(Very Common|Common|Rare)\s*$/gim,
    (_, val) => {
      const cls = val === "Very Common" ? "freq-very-common" : val === "Common" ? "freq-common" : "freq-rare";
      const emoji = val === "Very Common" ? "🔥" : val === "Common" ? "📌" : "💤";
      return `<span class="md-badge md-badge-${cls}">${emoji} ${val}</span>`;
    }
  );

  // 3. Difficulty badge (standalone line)
  text = text.replace(
    /^Difficulty:\s*(Easy|Medium|Hard)\s*$/gim,
    (_, val) => {
      const cls = val === "Easy" ? "diff-easy" : val === "Medium" ? "diff-medium" : "diff-hard";
      const emoji = val === "Easy" ? "🟢" : val === "Medium" ? "🟡" : "🔴";
      return `<span class="md-badge md-badge-${cls}">${emoji} ${val}</span>`;
    }
  );

  // 4. :::tags block → tag pill row (processed BEFORE generic directive handler)
  text = text.replace(
    /^:::tags\s*\n([\s\S]*?)\n^:::/gm,
    (_, body) => {
      const tags = body.split(/\n+/).map((t: string) => t.trim()).filter(Boolean);
      const pills = tags.map((tag: string) => `<span class="md-tag">${escapeHtml(tag)}</span>`).join("");
      return `<div class="md-tags">${pills}</div>`;
    }
  );

  // 5. ASCII flow diagrams — blocks containing arrow characters
  text = text.replace(
    /^((?:[^\n]+\n)*(?:[^\n]*(?:↓|→|←|↑|⬇|⬆|➡|⟶|⟹|=>|->)\s*\n)+[^\n]+)$/gm,
    (block) => {
      const arrowCount = (block.match(/[↓→←↑⬇⬆➡⟶⟹]|=>|->/g) || []).length;
      if (arrowCount < 1) return block;
      const escaped = escapeHtml(block);
      return `<div class="md-flow-diagram"><pre>${escaped}</pre></div>`;
    }
  );

  // 6. Generic directive blocks :::type\nbody\n:::
  //    Store each callout's data by index; emit a lightweight placeholder tag
  text = text.replace(
    /^:::([\w-]*)\s*\n([\s\S]*?)\n^:::/gm,
    (_, typeRaw, body) => {
      const type = (typeRaw || "info").trim().toLowerCase();
      const meta = DIRECTIVE_MAP[type] || DIRECTIVE_MAP.info;
      const idx = calloutStore.length;
      calloutStore.push({ icon: meta.icon, label: meta.label, body: body.trim(), cls: meta.cls });
      return `<${CALLOUT_PLACEHOLDER} data-idx="${idx}"></${CALLOUT_PLACEHOLDER}>`;
    }
  );

  return text;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Copy button ─────────────────────────────────────────────
function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <button onClick={handleCopy} className="code-block-copy" title="Copy code" type="button">
      {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

// ── Code Block with header ──────────────────────────────────
function CodeBlockWithHeader({ code, language }: { code: string; language: string }) {
  const lang = (language || "").toLowerCase().trim();
  const displayName = LANG_NAMES[lang] || (lang ? lang.charAt(0).toUpperCase() + lang.slice(1) : "Code");
  const highlighted = useMemo(() => highlightSyntax(code, lang), [code, lang]);
  const [expanded, setExpanded] = useState(false);
  const isLong = code.split("\n").length > 20;

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <div className="code-block-lang">
          <Code2 />
          <span>{displayName}</span>
        </div>
        <div className="code-block-actions">
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded((p) => !p)}
              className="code-block-expand"
              title={expanded ? "Collapse" : "Expand"}
            >
              <ChevronDown
                className="h-4 w-4 transition-transform duration-200"
                style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
              />
              <span>{expanded ? "Collapse" : "Expand"}</span>
            </button>
          )}
          <CopyButton code={code} />
        </div>
      </div>
      <div
        className="code-block-body"
        style={isLong && !expanded ? { maxHeight: "320px", overflow: "hidden" } : undefined}
      >
        <pre>
          <code dangerouslySetInnerHTML={{ __html: highlighted }} />
        </pre>
        {isLong && !expanded && (
          <div className="code-block-fade" onClick={() => setExpanded(true)}>
            <span className="code-block-expand-btn">Show more</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Icon resolver ────────────────────────────────────────────
function DirectiveIcon({ name, className }: { name: string; className?: string }) {
  const cls = className || "h-4 w-4";
  switch (name) {
    case "info":           return <Info className={cls} />;
    case "alert-circle":   return <AlertCircle className={cls} />;
    case "lightbulb":      return <Lightbulb className={cls} />;
    case "alert-triangle": return <AlertTriangle className={cls} />;
    case "check-circle":   return <CheckCircle2 className={cls} />;
    case "star":           return <Star className={cls} />;
    case "x-circle":       return <XCircle className={cls} />;
    case "help-circle":    return <HelpCircle className={cls} />;
    case "zap":            return <Zap className={cls} />;
    case "book-open":      return <BookOpen className={cls} />;
    default:               return <Info className={cls} />;
  }
}

// ── Parse inline markdown for callout bodies ─────────────────
function parseBodyMarkdown(body: string): string {
  const instance = new Marked({ gfm: true, breaks: true });
  return instance.parse(body) as string;
}

// ── Collapsible Follow-up Questions ─────────────────────────
function CollapsibleCard({
  icon, label, body, cls,
}: { icon: string; label: string; body: string; cls: string }) {
  const [open, setOpen] = useState(false);
  const html = useMemo(() => parseBodyMarkdown(body), [body]);

  return (
    <div className={`md-callout ${cls}`}>
      <button
        type="button"
        className="md-callout-toggle"
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
      >
        <div className="md-callout-header-inner">
          <DirectiveIcon name={icon} />
          <span className="md-callout-label">{label}</span>
        </div>
        <ChevronDown
          className="h-4 w-4 md-callout-chevron"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div
              className="md-callout-body prose-custom"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Generic / Summary Callout Card ────────────────────────────
function CalloutCard({
  icon, label, body, cls,
}: { icon: string; label: string; body: string; cls: string }) {
  const isCollapsible = cls.includes("followup");
  const html = useMemo(() => parseBodyMarkdown(body), [body]);

  if (isCollapsible) {
    return <CollapsibleCard icon={icon} label={label} body={body} cls={cls} />;
  }

  return (
    <div className={`md-callout ${cls}`}>
      <div className="md-callout-header">
        <DirectiveIcon name={icon} />
        <span className="md-callout-label">{label}</span>
      </div>
      <div
        className="md-callout-body prose-custom"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  SEGMENT PARSER
//  Parses full markdown into typed segments: html | code | callout
// ════════════════════════════════════════════════════════════

type Segment =
  | { type: "html"; content: string }
  | { type: "code"; code: string; language: string }
  | { type: "callout"; icon: string; label: string; body: string; cls: string };

function parseMarkdownToSegments(content: string): Segment[] {
  if (!content) return [];

  // Each parse call gets its own callout store so there's no cross-render bleed
  const calloutStore: Array<{ icon: string; label: string; body: string; cls: string }> = [];

  // Step 1: Pre-process special syntax
  const preprocessed = preprocessMarkdown(content, calloutStore);

  const usedIds = new Set<string>();
  const codeBlocks: Array<{ code: string; language: string }> = [];

  const customRenderer = new marked.Renderer();

  // Anchor IDs for TOC scrollspy
  customRenderer.heading = ({ text, depth }: { text: string; depth: number }) => {
    const clean = text.replace(/<[^>]+>/g, "");
    let baseId = clean
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-") || "heading";

    let id = baseId;
    let counter = 1;
    while (usedIds.has(id)) id = `${baseId}-${counter++}`;
    usedIds.add(id);
    return `<h${depth} id="${id}" class="scroll-mt-24">${text}</h${depth}>\n`;
  };

  // Replace fenced code blocks with indexed placeholders
  customRenderer.code = ({ text, lang }: { text: string; lang?: string }) => {
    const idx = codeBlocks.length;
    codeBlocks.push({ code: text, language: lang || "" });
    return `<${CODE_PLACEHOLDER} data-idx="${idx}"></${CODE_PLACEHOLDER}>`;
  };

  // Step 2: Parse preprocessed markdown with marked
  const markedInstance = new Marked({ renderer: customRenderer, gfm: true, breaks: false });
  const fullHtml = markedInstance.parse(preprocessed) as string;

  // Step 3: Split HTML on all placeholder tags
  const allPlaceholders = new RegExp(
    `<${CODE_PLACEHOLDER}\\s+data-idx="(\\d+)"><\\/${CODE_PLACEHOLDER}>` +
    `|<${CALLOUT_PLACEHOLDER}\\s+data-idx="(\\d+)"><\\/${CALLOUT_PLACEHOLDER}>`,
    "g"
  );

  const segments: Segment[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = allPlaceholders.exec(fullHtml)) !== null) {
    // Flush preceding HTML
    const htmlBefore = fullHtml.slice(lastIndex, m.index);
    if (htmlBefore.trim()) segments.push({ type: "html", content: htmlBefore });

    if (m[1] !== undefined) {
      // Code block
      const idx = parseInt(m[1], 10);
      const block = codeBlocks[idx];
      if (block) segments.push({ type: "code", code: block.code, language: block.language });
    } else {
      // Callout block
      const idx = parseInt(m[2], 10);
      const callout = calloutStore[idx];
      if (callout) segments.push({ type: "callout", ...callout });
    }

    lastIndex = m.index + m[0].length;
  }

  const trailing = fullHtml.slice(lastIndex);
  if (trailing.trim()) segments.push({ type: "html", content: trailing });

  return segments;
}

// ── Main MarkdownRenderer component ─────────────────────────
interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const segments = useMemo(() => parseMarkdownToSegments(content), [content]);

  return (
    <div className={`prose-custom ${className}`}>
      {segments.map((seg, i) => {
        if (seg.type === "html") {
          return (
            <div
              key={i}
              dangerouslySetInnerHTML={{ __html: seg.content }}
            />
          );
        }
        if (seg.type === "code") {
          return (
            <CodeBlockWithHeader
              key={`code-${i}`}
              code={seg.code}
              language={seg.language}
            />
          );
        }
        if (seg.type === "callout") {
          return (
            <CalloutCard
              key={`callout-${i}`}
              icon={seg.icon}
              label={seg.label}
              body={seg.body}
              cls={seg.cls}
            />
          );
        }
        return null;
      })}
    </div>
  );
}
