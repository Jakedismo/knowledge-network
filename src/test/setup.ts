import '@testing-library/jest-dom/vitest'
import { beforeAll, afterEach, afterAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Make vi available globally
global.vi = vi

// Setup and cleanup for React Testing Library
beforeAll(() => {
  // Any global setup
})

afterEach(() => {
  cleanup()
})

afterAll(() => {
  // Any global cleanup
})
