import { describe, it, expect, vi, beforeEach, waitFor } from 'vitest'
import { render, screen, waitFor as waitForTL, fireEvent, act } from '@testing-library/react'
import { EntryEditPage } from '../../src/pages/EntryEditPage'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { HeaderProvider } from '../../src/context/HeaderContext'
import { ThemeProvider } from '../../src/context/ThemeContext'
import { ToastProvider } from '../../src/context/ToastContext'
import { db } from '../../src/db/db'
import { vi as viFn } from 'vitest'

vi.mock('../../src/db/db', () => ({
  db: {
    entries: {
      get: vi.fn(),
    },
    categories: {
      get: vi.fn(),
    },
  },
}))

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter initialEntries={['/entry/new/1']}>
    <ThemeProvider>
      <HeaderProvider>
        <ToastProvider>
          <Routes>
            <Route path="/entry/new/:categoryId" element={children} />
          </Routes>
        </ToastProvider>
      </HeaderProvider>
    </ThemeProvider>
  </MemoryRouter>
)

const wrapperWithExistingEntry = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter initialEntries={['/entry/1/edit']}>
    <ThemeProvider>
      <HeaderProvider>
        <ToastProvider>
          <Routes>
            <Route path="/entry/:id/edit" element={children} />
          </Routes>
        </ToastProvider>
      </HeaderProvider>
    </ThemeProvider>
  </MemoryRouter>
)

const wrapperWithNewEntryAndCategory = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter initialEntries={['/entry/new/42']}>
    <ThemeProvider>
      <HeaderProvider>
        <ToastProvider>
          <Routes>
            <Route path="/entry/new/:categoryId" element={children} />
          </Routes>
        </ToastProvider>
      </HeaderProvider>
    </ThemeProvider>
  </MemoryRouter>
)

describe('EntryEditPage keyboard focus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  it('focuses title input on new entry without user interaction', async () => {
    render(<EntryEditPage />, { wrapper })
    const input = screen.getByPlaceholderText('Entry title')
    await waitForTL(() => expect(input).toHaveFocus())
  })

  it('does NOT auto-focus on existing entry edit', async () => {
    const mockEntry = {
      id: 1,
      categoryId: 1,
      title: 'Existing Entry',
      contentHtml: '<p>Content</p>',
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    vi.mocked(db.entries.get).mockResolvedValue(mockEntry)
    vi.mocked(db.categories.get).mockResolvedValue({ id: 1, name: 'Test', color: '#ff0000', sortOrder: 0 })

    render(<EntryEditPage />, { wrapper: wrapperWithExistingEntry })
    const input = screen.getByPlaceholderText('Entry title')
    
    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    
    expect(input).not.toHaveFocus()
  })
})

describe('EntryEditPage info bar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  it('displays category on new entry when categoryId present in URL', async () => {
    vi.mocked(db.categories.get).mockResolvedValue({ id: 42, name: 'Personal', color: '#ff0000', sortOrder: 0 })

    render(<EntryEditPage />, { wrapper: wrapperWithNewEntryAndCategory })

    const infoBar = screen.getByTestId('info-bar')
    await waitForTL(() => {
      expect(infoBar).toHaveTextContent('Personal')
    })
  })

  it('shows last updated date on existing entry edit', async () => {
    const mockEntry = {
      id: 1,
      categoryId: 1,
      title: 'Existing Entry',
      contentHtml: '<p>Content</p>',
      pinned: false,
      createdAt: Date.now() - 86400000,
      updatedAt: new Date('2024-01-15T14:30:00').getTime(),
    }
    vi.mocked(db.entries.get).mockResolvedValue(mockEntry)
    vi.mocked(db.categories.get).mockResolvedValue({ id: 1, name: 'Test', color: '#ff0000', sortOrder: 0 })

    render(<EntryEditPage />, { wrapper: wrapperWithExistingEntry })

    const infoBar = screen.getByTestId('info-bar')
    await waitForTL(() => {
      expect(infoBar).toHaveTextContent('January 15, 2024')
    })
  })
})