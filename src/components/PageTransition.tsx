import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12 }}
      className="flex flex-col flex-1 min-h-0"
    >
      {children}
    </motion.div>
  )
}
