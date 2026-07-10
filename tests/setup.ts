import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock IndexedDB for Dexie
const indexedDBMock = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
  cmp: vi.fn(),
}

Object.defineProperty(global, 'indexedDB', {
  value: indexedDBMock,
  writable: true,
  configurable: true,
})

// Mock IDBKeyRange
Object.defineProperty(global, 'IDBKeyRange', {
  value: {
    only: vi.fn(),
    lowerBound: vi.fn(),
    upperBound: vi.fn(),
    bound: vi.fn(),
  },
  writable: true,
  configurable: true,
})

// Suppress console.error in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('act(')) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})