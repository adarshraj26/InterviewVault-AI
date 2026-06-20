/**
 * Utility to parse simple markdown to standard HTML for Tiptap editor and dangerouslySetInnerHTML.
 */
export function markdownToHtml(md: string): string {
  if (!md) return "";
  
  // Standardize line endings
  let html = md.replace(/\r\n/g, "\n");
  
  // Escape HTML tags to prevent XSS except block elements we will generate
  // We keep it simple since Gemini generates safe markdown
  
  // Code Blocks: ```javascript ... ``` -> <pre><code class="language-javascript">...</code></pre>
  html = html.replace(/```(\w*)\n([\s\S]*?)\n```/g, (_, lang, code) => {
    const escapedCode = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<pre><code class="language-${lang || "javascript"}">${escapedCode}</code></pre>`;
  });
  
  // Inline code: `code` -> <code>code</code>
  html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  
  // Headings: H6 -> <h6>, H5 -> <h5>, H4 -> <h4>, H3 -> <h3>, H2 -> <h2>, H1 -> <h1>
  html = html.replace(/^###### (.*)$/gm, "<h6>$1</h6>");
  html = html.replace(/^##### (.*)$/gm, "<h5>$1</h5>");
  html = html.replace(/^#### (.*)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");
  
  // Bold: **text** -> <strong>text</strong>
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  
  // Italic: *text* -> <em>text</em>
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  
  // Blockquotes: > text -> <blockquote>text</blockquote>
  html = html.replace(/^> (.*)$/gm, "<blockquote>$1</blockquote>");
  
  // Tables:
  const lines = html.split("\n");
  let inTable = false;
  let tableRows: string[] = [];
  let resultLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("|") && line.endsWith("|")) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      tableRows.push(line);
    } else {
      if (inTable) {
        inTable = false;
        resultLines.push(parseMarkdownTable(tableRows));
        tableRows = [];
      }
      resultLines.push(lines[i]);
    }
  }
  if (inTable) {
    resultLines.push(parseMarkdownTable(tableRows));
  }
  html = resultLines.join("\n");
  
  // Lists:
  const listLines = html.split("\n");
  let inUl = false;
  let inOl = false;
  let processedLines: string[] = [];
  
  for (let i = 0; i < listLines.length; i++) {
    const line = listLines[i];
    const trimmed = line.trim();
    
    const isUlItem = trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ");
    const isOlItem = /^\d+\.\s+/.test(trimmed);
    
    if (isUlItem) {
      if (inOl) {
        processedLines.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        processedLines.push('<ul class="list-disc pl-5 my-2 space-y-1">');
        inUl = true;
      }
      const content = trimmed.replace(/^[-*•]\s+/, "");
      processedLines.push(`<li>${content}</li>`);
    } else if (isOlItem) {
      if (inUl) {
        processedLines.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        processedLines.push('<ol class="list-decimal pl-5 my-2 space-y-1">');
        inOl = true;
      }
      const content = trimmed.replace(/^\d+\.\s+/, "");
      processedLines.push(`<li>${content}</li>`);
    } else {
      if (inUl) {
        processedLines.push("</ul>");
        inUl = false;
      }
      if (inOl) {
        processedLines.push("</ol>");
        inOl = false;
      }
      processedLines.push(line);
    }
  }
  if (inUl) processedLines.push("</ul>");
  if (inOl) processedLines.push("</ol>");
  html = processedLines.join("\n");
  
  // Paragraphs:
  const paraBlocks = html.split(/\n\n+/);
  const finalBlocks = paraBlocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return "";
    
    const isBlockTag = /^(<h[1-6]|<pre|<ul|<ol|<blockquote|<table|<p|<div)/i.test(trimmed);
    if (isBlockTag) return trimmed;
    
    return `<p class="my-2">${trimmed.replace(/\n/g, "<br />")}</p>`;
  });
  
  return finalBlocks.filter(Boolean).join("\n");
}

function parseMarkdownTable(rows: string[]): string {
  if (rows.length === 0) return "";
  
  let html = '<div class="overflow-x-auto my-4"><table class="min-w-full divide-y divide-border border border-border rounded-xl text-left text-xs bg-black/10">';
  
  let hasSeparator = false;
  if (rows.length > 1) {
    const secondRow = rows[1].replace(/\s+/g, "");
    if (/^\|[-:|]+\|$/.test(secondRow)) {
      hasSeparator = true;
    }
  }
  
  rows.forEach((row, idx) => {
    if (hasSeparator && idx === 1) return;
    
    const cells = row.split("|").slice(1, -1).map(c => c.trim());
    const isHeader = hasSeparator && idx === 0;
    
    html += `<tr class="${isHeader ? "bg-black/35 font-bold uppercase tracking-wider" : "hover:bg-muted/10 transition-colors border-b border-border/40"}">`;
    cells.forEach(cell => {
      if (isHeader) {
        html += `<th class="p-3 border-b border-border">${cell}</th>`;
      } else {
        html += `<td class="p-3 border-b border-border/45">${cell}</td>`;
      }
    });
    html += "</tr>";
  });
  
  html += "</table></div>";
  return html;
}
