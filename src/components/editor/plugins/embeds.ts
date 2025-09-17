import type { EditorPlugin } from "../api";

export function EmbedsPlugin(): EditorPlugin {
  return {
    name: "embeds",
    onRenderHTML(html: string) {
      return html; // embedding handled in parser autoEmbed
    },
  };
}

