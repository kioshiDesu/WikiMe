import { useEffect, useState } from 'react'

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit' | 'done'>('enter')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('visible'), 100)
    const t2 = setTimeout(() => setPhase('exit'), 1600)
    const t3 = setTimeout(() => { setPhase('done'); onComplete() }, 2100)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onComplete])

  if (phase === 'done') return null

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-gray-950 transition-all duration-500"
      style={{
        opacity: phase === 'exit' ? 0 : 1,
      }}
    >
      <h1
        className="text-5xl font-bold tracking-tight select-none"
        style={{
          color: '#14b8a6',
          transform: phase === 'enter' ? 'translateY(12px)' : 'translateY(0)',
          opacity: phase === 'enter' ? 0 : 1,
          transition: 'transform 600ms ease-out, opacity 600ms ease-out',
        }}
      >
        WikiMe
      </h1>
      <div
        className="h-1 rounded-full mt-3"
        style={{
          width: 32,
          backgroundColor: '#14b8a6',
          opacity: phase === 'enter' ? 0 : 0.5,
          transition: 'opacity 800ms ease-out 200ms',
        }}
      />
    </div>
  )
}
