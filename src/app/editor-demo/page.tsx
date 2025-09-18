"use client";
export const dynamic = "force-dynamic";
import React, { useEffect, useRef } from "react";
import { EditorProvider, useEditor } from "@/components/editor/EditorProvider";
import { Preview } from "@/components/editor/Preview";
import { AssistantSuggestions } from "@/components/editor/plugins/AssistantSuggestions";
import { EmbedsPlugin } from "@/components/editor/plugins/embeds";
import { ImageUploadPlugin } from "@/components/editor/plugins/image-upload";
import { LatexPlugin } from "@/components/editor/plugins/latex";
import { useEditorStore } from "@/components/editor/state";

export default function EditorDemoPage() {
  const initial = [
    "# Knowledge Network Editor",
    "",
    "- Markdown with live preview",
    "- Drag & drop images",
    "- Embeds: https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "",
    "## Code",
    "",
    "```ts",
    "export const hello = (name: string) => `Hello, ${name}`;",
    "```",
    "",
    "## Math",
    "",
    "$$",
    "a^2 + b^2 = c^2",
    "$$",
  ].join("\n");

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-2">Editor Demo</h1>
      <EditorProvider>
        <InitializeContent markdown={initial} />
        <BasicEditorArea />
      </EditorProvider>
    </div>
  );
}

function RegisterDefaultPlugins() {
  const ctx = useEditor();
  useEffect(() => {
    ctx.registerPlugin(EmbedsPlugin());
    ctx.registerPlugin(ImageUploadPlugin());
    ctx.registerPlugin(LatexPlugin());
    return () => {
      ctx.unregisterPlugin("embeds");
      ctx.unregisterPlugin("image-upload");
      ctx.unregisterPlugin("latex");
    };
    // ctx is stable for our provider usage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function InitializeContent({ markdown }: { markdown: string }) {
  const setContent = useEditorStore((s) => s.setContent);
  useEffect(() => {
    setContent(markdown);
  }, [markdown, setContent]);
  return null;
}

function BasicEditorArea() {
  const content = useEditorStore((s) => s.content);
  const setContent = useEditorStore((s) => s.setContent);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <textarea
        ref={taRef}
        aria-label="Markdown editor"
        className="min-h-[200px] w-full resize-y rounded-md border bg-background p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="prose prose-sm dark:prose-invert max-w-none md:col-span-1">
        <Preview markdown={content} />
      </div>
      <div className="hidden md:block">
        <AssistantSuggestions
          getSelectionText={() => {
            const el = taRef.current;
            if (!el) return "";
            const start = el.selectionStart ?? 0;
            const end = el.selectionEnd ?? 0;
            return el.value.slice(start, end);
          }}
        />
      </div>
    </div>
  );
}
