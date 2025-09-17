import { describe, it, expect } from "vitest";
import { markdownToHtml } from "../markdown/parser";

describe("markdownToHtml", () => {
  it("renders headings, emphasis, code, links", () => {
    const md = `# Title\n\nSome **bold** and *italic* with \`code\` and [link](https://example.com).`;
    const html = markdownToHtml(md);
    expect(html).toContain("<h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<code>code</code>");
    expect(html).toContain('<a href="https://example.com"');
  });

  it("renders fenced code with language class", () => {
    const md = "```ts\nconst a: number = 1;\n```";
    const html = markdownToHtml(md);
    expect(html).toContain("<pre><code class=\"language-ts\"");
  });

  it("embeds YouTube and Vimeo links on own line when enabled", () => {
    const md = `https://www.youtube.com/watch?v=dQw4w9WgXcQ\n\nhttps://vimeo.com/123456`;
    const html = markdownToHtml(md, { enableEmbeds: true });
    expect(html).toContain("youtube");
    expect(html).toContain("vimeo");
  });

  it("escapes html to prevent injection", () => {
    const md = `<script>alert('x')</script>`;
    const html = markdownToHtml(md);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
