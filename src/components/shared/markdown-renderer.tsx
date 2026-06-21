"use client";

import { useMemo, useState, useCallback } from "react";
import { marked } from "marked";
import { Code2, Copy, Check } from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   MarkdownRenderer — premium markdown display
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
        if (tag) return match.replace(/(&lt;\/?)([^\s]*)/, '$1<span class="token-tag">$2</span>');
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
      /(--.*)|(".*?"|'.*?')|(\b\d+\b)|\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|FULL|CROSS|ON|AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|DROP|ALTER|INDEX|VIEW|TRIGGER|FUNCTION|PROCEDURE|BEGIN|END|IF|THEN|ELSE|CASE|WHEN|GROUP|BY|ORDER|ASC|DESC|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|AS|NULL|IS|DEFAULT|PRIMARY|KEY|FOREIGN|REFERENCES|CONSTRAINT|CHECK|UNIQUE|COUNT|SUM|AVG|MIN|MAX|COALESCE|CAST|CONVERT|DECLARE|RETURN|RETURNS)\b/gi,
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
      /(#.*)|(['"'])([\s\S]*?)\2|(\$\w+)|\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|exit|echo|cd|ls|mkdir|rm|cp|mv|cat|grep|sed|awk|sudo|apt|yum|brew|npm|npx|yarn|pnpm|pip|git|docker|kubectl)\b/g,
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

export function extractToc(markdown: string): TocEntry[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const toc: TocEntry[] = [];
  const usedIds = new Set<string>();
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].replace(/[*_`~\[\]]/g, "").trim();
    let baseId = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-") || "heading";

    let id = baseId;
    let counter = 1;
    while (usedIds.has(id)) id = `${baseId}-${counter++}`;
    usedIds.add(id);

    if (level >= 2 && level <= 3) toc.push({ id, text, level });
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

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <div className="code-block-lang">
          <Code2 />
          <span>{displayName}</span>
        </div>
        <CopyButton code={code} />
      </div>
      <pre>
        <code dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  );
}

// ── Markdown pre-processing ──────────────────────────────────
// Split raw markdown into alternating text/code-block chunks
// using a reliable line-by-line parser (no regex fragility).
interface RawChunk {
  type: "markdown" | "code";
  content: string;
  language?: string;
}

function splitMarkdownCodeBlocks(markdown: string): RawChunk[] {
  // Normalize line endings
  const normalized = markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");

  const chunks: RawChunk[] = [];
  let i = 0;
  let textLines: string[] = [];

  while (i < lines.length) {
    const line = lines[i];
    // Check for fenced code block opening (``` or ~~~)
    const fenceMatch = line.match(/^(`{3,}|~{3,})([\w\-+#.]*).*/);
    if (fenceMatch) {
      // Flush accumulated text first
      if (textLines.length > 0) {
        chunks.push({ type: "markdown", content: textLines.join("\n") });
        textLines = [];
      }
      const fenceChar = fenceMatch[1][0]; // ` or ~
      const fenceLen = fenceMatch[1].length; // number of fence chars
      const lang = fenceMatch[2].trim();
      i++;

      // Collect code lines until matching closing fence
      const codeLines: string[] = [];
      const closingFence = fenceChar.repeat(fenceLen);
      while (i < lines.length) {
        const codeLine = lines[i];
        // Closing fence: starts with fenceLen (or more) of the same fence char, nothing else
        if (codeLine.trimEnd().match(new RegExp(`^${fenceChar === "`" ? "\\`" : "~"}{${fenceLen},}\\s*$`))) {
          i++; // skip closing fence line
          break;
        }
        codeLines.push(codeLine);
        i++;
      }

      chunks.push({ type: "code", content: codeLines.join("\n"), language: lang });
    } else {
      textLines.push(line);
      i++;
    }
  }

  // Flush remaining text
  if (textLines.length > 0) {
    chunks.push({ type: "markdown", content: textLines.join("\n") });
  }

  return chunks;
}

// ── Parse markdown chunk to HTML with heading IDs ────────────
function parseMarkdownChunk(mdText: string, usedIds: Set<string>): string {
  if (!mdText.trim()) return "";

  const customRenderer = new marked.Renderer();
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

    return `<h${depth} id="${id}">${text}</h${depth}>`;
  };

  marked.setOptions({ renderer: customRenderer, gfm: true, breaks: false });
  return marked.parse(mdText) as string;
}

// ── Types ────────────────────────────────────────────────────
type Segment =
  | { type: "html"; content: string }
  | { type: "code"; code: string; language: string };

// ── Main MarkdownRenderer component ─────────────────────────
interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const segments = useMemo((): Segment[] => {
    if (!content) return [];

    // Step 1: Split markdown into text/code chunks using line-by-line parser
    const chunks = splitMarkdownCodeBlocks(content);

    // Step 2: Parse each markdown chunk to HTML, sharing heading ID state
    const usedIds = new Set<string>();
    const result: Segment[] = [];

    for (const chunk of chunks) {
      if (chunk.type === "markdown") {
        const html = parseMarkdownChunk(chunk.content, usedIds);
        if (html.trim()) {
          result.push({ type: "html", content: html });
        }
      } else {
        // Code block
        result.push({
          type: "code",
          code: chunk.content,
          language: chunk.language || "",
        });
      }
    }

    return result;
  }, [content]);

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
        return (
          <CodeBlockWithHeader
            key={`code-${i}`}
            code={seg.code}
            language={seg.language}
          />
        );
      })}
    </div>
  );
}
