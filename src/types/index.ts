export type { Section, Category, Entry } from '../db/db'

export interface HeaderConfig {
  title: string
  showBack?: boolean
  onBack?: () => void
  rightAction?: React.ReactNode
}
