import type { EditorAPI, EditorPlugin } from "../api";

async function fileToOptimizedDataUrl(file: File, maxW = 1600, maxH = 1200, quality = 0.82): Promise<string> {
  if (typeof window === "undefined" || !("createElement" in document)) {
    return URL.createObjectURL(file);
  }
  const img = document.createElement("img");
  const load = new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
  });
  img.src = URL.createObjectURL(file);
  await load;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return URL.createObjectURL(file);
  let { width, height } = img;
  const ratio = Math.min(maxW / width, maxH / height, 1);
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  URL.revokeObjectURL(img.src);
  return dataUrl;
}

export function ImageUploadPlugin(): EditorPlugin {
  return {
    name: "image-upload",
    async onDrop(files, api: EditorAPI) {
      const list = Array.from(files);
      const images = list.filter((f) => f.type.startsWith("image/"));
      if (!images.length) return;
      const parts: string[] = [];
      for (const img of images) {
        try {
          const url = await fileToOptimizedDataUrl(img);
          parts.push(`![${img.name}](${url})`);
        } catch {
          parts.push(`![${img.name}](${URL.createObjectURL(img)})`);
        }
      }
      api.insertAtCursor(parts.join("\n"));
    },
  };
}

export { fileToOptimizedDataUrl };

