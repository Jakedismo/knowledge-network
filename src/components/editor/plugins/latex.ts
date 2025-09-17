import type { EditorPlugin } from "../api";

// Placeholder: delegates rendering to external KaTeX adapter when available.
export function LatexPlugin(): EditorPlugin {
  return {
    name: "latex",
    onRenderHTML(html: string) {
      // In absence of KaTeX, keep plain text inside .katex-math
      // Integrators can hydrate this selector to render math.
      return html;
    },
  };
}

