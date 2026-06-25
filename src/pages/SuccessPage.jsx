import { useEffect } from 'react'
import { motion } from 'framer-motion'
import ParticleField from '../components/ParticleField'
import RouterLogo from '../components/RouterLogo'

export default function SuccessPage() {
  const params = new URLSearchParams(window.location.search)
  const email  = params.get('email') || ''
  const orig   = params.get('dst')   || 'https://www.google.com'

  useEffect(() => {
    const t = setTimeout(() => { window.location.href = orig }, 5000)
    return () => clearTimeout(t)
  }, [orig])

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-cyber-black hex-grid overflow-hidden">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <ParticleField />

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 glass-card neon-border p-10 flex flex-col items-center gap-6 max-w-sm w-full mx-4"
      >
        {/* Animated success ring */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 180, delay: 0.2 }}
          className="relative"
        >
          <svg className="animate-spin-slow" width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#00ff88" strokeWidth="1" strokeDasharray="8 6" opacity="0.3" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-16 h-16 rounded-full bg-cyber-green/10 border-2 border-cyber-green/50 flex items-center justify-center"
              style={{ boxShadow: '0 0 40px rgba(0,255,136,0.35)' }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </motion.div>

        <div className="text-center">
          <h1 className="font-orbitron font-bold text-xl tracking-widest text-cyber-green mb-2">
            CONNECTED
          </h1>
          <p className="text-sm text-white/50">Network access granted</p>
          {email && (
            <p className="text-xs font-mono text-white/30 mt-1">{email}</p>
          )}
        </div>

        <div className="w-full">
          <div className="flex justify-between text-xs text-white/30 font-mono mb-1">
            <span>Redirecting…</span>
            <span>5s</span>
          </div>
          <motion.div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="progress-bar h-full rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 5, ease: 'linear' }}
            />
          </motion.div>
        </div>

        <RouterLogo size={40} />
        <p className="text-[10px] text-white/15 font-mono tracking-wider text-center">
          MIKROTIK ROUTEROS · AUTHENTICATED SESSION
        </p>
      </motion.div>
    </div>
  )
}
