declare module '*.css' {
  const content: string
  export default content
}

declare module '*.scss' {
  const content: string
  export default content
}

declare module '*.sass' {
  const content: string
  export default content
}

declare module 'katex'
declare module 'prismjs'
declare module 'prismjs/components/*'
declare module 'apollo-upload-client'

declare global {
  interface Window {
    Prism?: {
      highlightAllUnder: (element: Element) => void
    }
    katex?: {
      renderToString: (expression: string, options?: { throwOnError?: boolean }) => string
    }
  }
}

export {}
