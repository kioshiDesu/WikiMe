import { createHashRouter } from 'react-router-dom'
import { HeaderProvider } from './context/HeaderContext'
import { AppShell } from './components/AppShell'
import { HomePage } from './pages/HomePage'
import { CategoryPage } from './pages/CategoryPage'
import { NewCategoryPage } from './pages/NewCategoryPage'
import { EntryViewPage } from './pages/EntryViewPage'
import { EntryEditPage } from './pages/EntryEditPage'
import { SettingsPage } from './pages/SettingsPage'
import { NewSectionPage } from './pages/NewSectionPage'
import { TrashPage } from './pages/TrashPage'

export const router = createHashRouter([
  {
    element: <HeaderProvider><AppShell /></HeaderProvider>,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/category/new', element: <NewCategoryPage /> },
      { path: '/category/:id', element: <CategoryPage /> },
      { path: '/entry/new/:categoryId', element: <EntryEditPage /> },
      { path: '/entry/:id', element: <EntryViewPage /> },
      { path: '/entry/:id/edit', element: <EntryEditPage /> },
      { path: '/section/new', element: <NewSectionPage /> },
      { path: '/section/:id', element: <NewSectionPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/trash', element: <TrashPage /> },
    ],
  },
])
