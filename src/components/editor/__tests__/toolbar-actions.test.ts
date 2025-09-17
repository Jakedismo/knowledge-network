import { describe, it, expect } from "vitest";
import {
  insertCodeBlock,
  insertHeading,
  insertImage,
  insertLink,
  Selection,
  surround,
  toggleList,
} from "../toolbar-actions";

const initialSelection: Selection = { start: 0, end: 0 };

describe("toolbar-actions", () => {
  it("wraps selection with delimiters", () => {
    const text = "hello";
    const result = surround(text, { start: 0, end: 5 }, "**");
    expect(result.next).toBe("**hello**");
    expect(result.newSel).toEqual({ start: 2, end: 7 });
  });

  it("inserts heading hashes at line start", () => {
    const result = insertHeading("Paragraph", { start: 4, end: 4 }, 2);
    expect(result.next.startsWith("## ")).toBe(true);
    expect(result.newSel.start).toBe(7);
  });

  it("prefixes unordered lists", () => {
    const text = "item1\nitem2";
    const result = toggleList(text, { start: 0, end: text.length }, false);
    expect(result.next).toBe("- item1\n- item2");
    expect(result.newSel.start).toBeGreaterThan(0);
  });

  it("inserts markdown link", () => {
    const result = insertLink("hello", { start: 0, end: 5 }, "https://example.com", "Example");
    expect(result.next).toBe("[Example](https://example.com)");
    expect(result.newSel).toEqual({ start: 1, end: 8 });
  });

  it("inserts image syntax", () => {
    const result = insertImage("hello", initialSelection, "https://cdn/img.png", "alt");
    expect(result.next).toBe("![alt](https://cdn/img.png)hello");
  });

  it("inserts fenced code block with language", () => {
    const text = "sample";
    const result = insertCodeBlock(text, { start: 0, end: text.length }, "ts");
    expect(result.next).toContain("```ts");
    expect(result.next).toContain("sample");
  });
});
