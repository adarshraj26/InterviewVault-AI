const content = `still nothing

## Why this matters

One of the most common React interview topics is how forms are handled.

In React, form elements such as:

- Input fields
- Textareas
- Checkboxes
- Radio buttons
- Select dropdowns

can be managed in two ways:

1. Controlled Components
2. Uncontrolled Components

Understanding the difference is important because almost every real-world application contains forms.

---

# What is a Controlled Component?

A Controlled Component is a form element whose value is controlled by React State.
`;

function extractToc(content) {
  const toc = [];
  const usedIds = new Set();
  
  // Match Markdown ## Heading or HTML <h2>Heading</h2>
  const regex = /^(#{1,3})\s+(.+)$|<h([123])[^>]*>(.*?)<\/h\3>/gmi;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const isMarkdown = !!match[1];
    const level = isMarkdown ? match[1].length : parseInt(match[3], 10);
    let rawText = isMarkdown ? match[2] : match[4];
    
    const text = rawText.replace(/<[^>]+>/g, "").replace(/[*_\`~\[\]]/g, "").trim();

    let baseId = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-") || "heading";

    let id = baseId;
    let counter = 1;
    while (usedIds.has(id)) id = `${baseId}-` + (counter++);
    usedIds.add(id);

    toc.push({ id, text, level });
  }

  return toc;
}

console.log(extractToc(content));
