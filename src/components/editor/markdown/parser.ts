import { escapeHtml } from "./escape";
import {
  sanitizeTwitterUrl,
  sanitizeVimeoUrl,
  sanitizeYouTubeUrl,
} from "@/lib/editor/sanitizers";

export type MarkdownParseOptions = {
  enableEmbeds?: boolean;
};

const codeFenceRe = /^```(\w+)?\n([\s\S]*?)\n```$/m;

function parseInline(md: string): string {
  // Escape first to prevent raw HTML injection
  let s = escapeHtml(md);
  // Bold **text**
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic *text*
  s = s.replace(/(^|\W)\*(?!\s)(.+?)\*(?!\w)/g, "$1<em>$2</em>");
  // Inline code `code`
  s = s.replace(/`([^`]+?)`/g, "<code>$1</code>");
  // Links [text](https://...)
  s = s.replace(/\[([^\]]+?)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  // Images ![alt](https://...)
  s = s.replace(/!\[([^\]]*?)\]\((https?:[^)\s]+|blob:[^)\s]+|data:[^)\s]+)\)/g, '<img alt="$1" src="$2" />');
  return s;
}

function parseList(block: string): string | null {
  const lines = block.split(/\n/);
  if (lines.length === 0 || !lines.every((l) => /^\s*([-*+]\s+|\d+\.\s+)/.test(l))) return null;
  const isOrdered = /^\s*\d+\./.test(lines[0]!);
  const items = lines
    .map((l) => l.replace(/^\s*(?:[-*+]\s+|\d+\.\s+)/, ""))
    .map((t) => `<li>${parseInline(t)}</li>`) // inline only
    .join("");
  return isOrdered ? `<ol>${items}</ol>` : `<ul>${items}</ul>`;
}

function parseHeading(line: string): string | null {
  const m = /^(#{1,6})\s+(.*)$/.exec(line);
  if (!m) return null;
  const level = m[1]!.length;
  const text = parseInline(m[2]!);
  return `<h${level}>${text}</h${level}>`;
}

function parseCodeBlock(block: string): string | null {
  const m = codeFenceRe.exec(block);
  if (!m) return null;
  const lang = (m[1] as string | undefined) || "";
  const code = escapeHtml((m[2] as string | undefined) ?? "");
  const cls = lang ? ` class="language-${lang}"` : "";
  return `<pre><code${cls} data-lang="${lang}">${code}</code></pre>`;
}

function parseLatex(block: string): string | null {
  const m = /^\$\$\n?([\s\S]*?)\n?\$\$$/m.exec(block);
  if (!m) return null;
  const expr = escapeHtml(m[1]!.trim());
  return `<span class="katex-math" aria-label="math">${expr}</span>`;
}

function parseParagraph(block: string): string {
  const trimmed = block.trim();
  if (!trimmed) return "";
  return `<p>${parseInline(trimmed)}</p>`;
}

export function markdownToHtml(md: string, opts: MarkdownParseOptions = {}): string {
  // Normalize newlines
  const input = md.replace(/\r\n?/g, "\n");
  const blocks: string[] = [];

  // Split into blocks while keeping fenced code blocks intact
  let i = 0;
  const lines = input.split("\n");
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.startsWith("```")) {
      const start = i;
      i++;
      while (i < lines.length && !/^```/.test(lines[i]!)) i++;
      const langLine = lines[start]!.replace(/^```/, "");
      const lang = langLine.trim();
      const code = lines.slice(start + 1, i).join("\n");
      blocks.push("```" + lang + "\n" + code + "\n```");
      i++; // skip closing ```
      continue;
    }
    // Latex block $$
    if (line.startsWith("$$")) {
      const start = i;
      i++;
      while (i < lines.length && !/^\$\$/.test(lines[i]!)) i++;
      const expr = lines.slice(start + 1, i).join("\n");
      blocks.push(`$$\n${expr}\n$$`);
      i++;
      continue;
    }
    // Accumulate until blank line for paragraph/list/heading
    const buf: string[] = [];
    while (i < lines.length && lines[i]!.trim() !== "") {
      buf.push(lines[i]!);
      i++;
    }
    blocks.push(buf.join("\n"));
    // skip blank lines
    while (i < lines.length && lines[i]!.trim() === "") i++;
  }

  const htmlParts: string[] = [];
  for (const block of blocks) {
    if (!block.trim()) continue;
    const code = parseCodeBlock(block);
    if (code) {
      htmlParts.push(code);
      continue;
    }
    const latex = parseLatex(block);
    if (latex) {
      htmlParts.push(latex);
      continue;
    }
    const list = parseList(block);
    if (list) {
      htmlParts.push(list);
      continue;
    }
    const lines2 = block.split("\n");
    if (lines2.length === 1) {
      const h = parseHeading(lines2[0]);
      if (h) {
        htmlParts.push(h);
        continue;
      }
    }
    htmlParts.push(parseParagraph(block));
  }

  let html = htmlParts.join("\n");

  if (opts.enableEmbeds) {
    html = autoEmbed(html);
  }

  return html;
}

// Basic auto-embed for YouTube, Vimeo, Twitter URLs present on their own line
function autoEmbed(html: string): string {
  return html.replace(/<p>(https?:\/\/[^<]+)<\/p>/g, (_match, rawUrl: string) => {
    const url = rawUrl.trim()
    const yt = sanitizeYouTubeUrl(url)
    if (yt) {
      return `
<div class="embed youtube">
  <iframe
    src="${yt}"
    title="YouTube video"
    loading="lazy"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
    referrerpolicy="strict-origin-when-cross-origin"
    sandbox="allow-scripts allow-same-origin allow-presentation"
  ></iframe>
</div>`.trim()
    }

    const vimeo = sanitizeVimeoUrl(url)
    if (vimeo) {
      return `
<div class="embed vimeo">
  <iframe
    src="${vimeo}"
    title="Vimeo video"
    loading="lazy"
    allow="autoplay; fullscreen; picture-in-picture"
    allowfullscreen
    referrerpolicy="strict-origin-when-cross-origin"
    sandbox="allow-scripts allow-same-origin allow-presentation"
  ></iframe>
</div>`.trim()
    }

    const tweet = sanitizeTwitterUrl(url)
    if (tweet) {
      const safe = escapeHtml(tweet)
      return `
<figure class="embed tweet">
  <a href="${safe}" target="_blank" rel="noopener noreferrer">View post on X</a>
</figure>`.trim()
    }

    return `<p>${escapeHtml(url)}</p>`
  })
}
