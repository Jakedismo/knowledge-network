// Re-export all UI components
export * from './ui'

// Layout components
export { Header } from './layout/header'
export { Sidebar } from './layout/sidebar'
export { MainLayout } from './layout/main-layout'
// Editor
export * from './editor'
// Editor exports
export * from './editor/api'
export { EditorProvider } from './editor/EditorProvider'
export { Editor } from './editor/Editor'

// Collaboration UI
export { PresenceSidebar } from './collab/PresenceSidebar'
export { SyncIndicator } from './collab/SyncIndicator'
export { ConflictBanner } from './collab/ConflictBanner'

// Organization (2C)
export * as Organization from './organization'
