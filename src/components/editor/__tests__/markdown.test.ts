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
    expect(html).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(html).toContain("player.vimeo.com/video/123456");
    expect(html).toContain("sandbox=\"allow-scripts allow-same-origin allow-presentation\"");
  });

  it("embeds X/Twitter links as accessible cards", () => {
    const md = `https://x.com/user/status/1234567890`;
    const html = markdownToHtml(md, { enableEmbeds: true });
    expect(html).toContain("class=\"embed tweet\"");
    expect(html).toContain("View post on X");
  });

  it("escapes html to prevent injection", () => {
    const md = `<script>alert('x')</script>`;
    const html = markdownToHtml(md);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders unordered lists", () => {
    const md = `- Item 1\n- Item 2`;
    const html = markdownToHtml(md);
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>Item 1</li>");
    expect(html).toContain("<li>Item 2</li>");
  });

  it("renders markdown headings", () => {
    const md = `### Heading`; 
    const html = markdownToHtml(md);
    expect(html).toContain("<h3>Heading</h3>");
  });

  it("renders math blocks as katex placeholders", () => {
    const md = `$$\na^2 + b^2 = c^2\n$$`;
    const html = markdownToHtml(md);
    expect(html).toContain("class=\"katex-math\"");
    expect(html).toContain("a^2 + b^2 = c^2");
  });

  it("ignores unsupported embeds", () => {
    const md = `https://example.com/video/123`;
    const html = markdownToHtml(md, { enableEmbeds: true });
    expect(html).toContain("<p>https://example.com/video/123</p>");
  });
});
