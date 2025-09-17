export type EditorContentFormat = "markdown" | "html";

export interface EditorExportOptions {
  format?: EditorContentFormat;
}

export interface EditorAPI {
  getContent: (format?: EditorContentFormat) => string;
  setContent: (content: string, format?: EditorContentFormat) => void;
  focus: () => void;
  insertAtCursor: (markdown: string) => void;
  // future: export/import, history, etc.
}

export interface EditorContextValue {
  api: EditorAPI;
  registerPlugin: (plugin: EditorPlugin) => void;
  unregisterPlugin: (name: string) => void;
}

export type EditorPlugin = {
  name: string;
  // Called once after mount
  onInit?: (ctx: { getContent: () => string; setContent: (md: string) => void }) => void;
  // Called when user types/pastes; return updated text or undefined to skip
  onTextInput?: (args: {
    text: string;
    selectionStart: number;
    selectionEnd: number;
  }) => string | undefined;
  // Handle drag & drop assets
  onDrop?: (files: FileList | File[], api: EditorAPI) => Promise<void> | void;
  // Allow post-processing of HTML preview
  onRenderHTML?: (html: string) => string;
};
