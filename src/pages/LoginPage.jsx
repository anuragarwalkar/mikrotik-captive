import { useState, useCallback } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { motion, AnimatePresence } from 'framer-motion'
import ParticleField from '../components/ParticleField'
import RouterLogo from '../components/RouterLogo'
import NetworkBar from '../components/NetworkBar'

// Parse MikroTik hotspot query params from URL
function useHotspotParams() {
  const params = new URLSearchParams(window.location.search)
  return {
    linkLogin:  params.get('link-login')  || params.get('linkLogin')  || '',
    linkOrig:   params.get('link-orig')   || params.get('dst')        || '',
    linkLogout: params.get('link-logout') || '',
    mac:        params.get('mac')         || '',
    ip:         params.get('ip')          || '',
    username:   params.get('username')    || '',
  }
}

// Step states
const STEP = {
  IDLE:        'idle',
  GOOGLE:      'google',
  VERIFYING:   'verifying',
  AUTHORIZED:  'authorized',
  REDIRECTING: 'redirecting',
  DENIED:      'denied',
  ERROR:       'error',
}

export default function LoginPage() {
  const hotspot = useHotspotParams()
  const [step, setStep]       = useState(STEP.IDLE)
  const [userInfo, setUserInfo] = useState(null)
  const [errMsg, setErrMsg]   = useState('')

  // ── Google OAuth (popup, implicit flow – no backend callback needed) ──
  const loginWithGoogle = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      setStep(STEP.VERIFYING)
      try {
        // Fetch profile from Google using the access token
        const profileRes = await fetch(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
        )
        if (!profileRes.ok) throw new Error('Failed to fetch Google profile')
        const profile = await profileRes.json()
        setUserInfo(profile)

        // Google identity verified — submit directly to MikroTik hotspot
        setStep(STEP.AUTHORIZED)
        setTimeout(() => {
          setStep(STEP.REDIRECTING)
          // Use email as username; MikroTik User Manager handles RADIUS auth
          submitMikrotikLogin(profile.email, tokenResponse.access_token, hotspot)
        }, 1800)
      } catch (err) {
        console.error(err)
        setStep(STEP.ERROR)
        setErrMsg('An unexpected error occurred. Please try again.')
      }
    },
    onError: (err) => {
      console.error('Google OAuth error', err)
      setStep(STEP.ERROR)
      setErrMsg('Google sign-in was cancelled or failed.')
    },
  })

  // ── Submit hidden form to MikroTik hotspot login endpoint ──
  const submitMikrotikLogin = useCallback((username, password, hs) => {
    const form = document.createElement('form')
    form.method  = 'POST'
    // If MikroTik provided a login URL use it, otherwise fallback to /login
    form.action  = hs.linkLogin || '/login'
    form.style.display = 'none'

    const fields = {
      username: username,
      password: password,
      dst:      hs.linkOrig,
      popup:    'false',
    }
    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement('input')
      input.type  = 'hidden'
      input.name  = name
      input.value = value || ''
      form.appendChild(input)
    })

    document.body.appendChild(form)
    form.submit()
  }, [])

  const handleGoogleClick = () => {
    setStep(STEP.GOOGLE)
    loginWithGoogle()
  }

  const handleRetry = () => {
    setStep(STEP.IDLE)
    setErrMsg('')
    setUserInfo(null)
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-cyber-black hex-grid scanline overflow-hidden">
      {/* Ambient orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Particle canvas */}
      <ParticleField />

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="w-6 h-px bg-cyber-cyan opacity-60" />
          <span className="font-orbitron text-xs tracking-[0.3em] text-cyber-cyan uppercase opacity-70">
            RouterOS
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="status-dot online" />
          <span className="text-xs font-mono text-cyber-green tracking-wider">SECURE</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-orbitron text-xs tracking-[0.3em] text-cyber-cyan uppercase opacity-70">
            HotSpot
          </span>
          <div className="w-6 h-px bg-cyber-cyan opacity-60" />
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {/* Card */}
          <div className="glass-card neon-border p-8 md:p-10 flex flex-col items-center gap-6">

            {/* Logo + title */}
            <motion.div
              className="flex flex-col items-center gap-4"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="animate-float">
                <RouterLogo size={88} />
              </div>
              <div className="text-center">
                <h1 className="font-orbitron font-bold text-2xl tracking-widest text-white mb-1">
                  NETWORK ACCESS
                </h1>
                <p className="font-orbitron text-xs tracking-[0.4em] text-cyber-cyan uppercase">
                  Secure Authentication Portal
                </p>
              </div>
            </motion.div>

            {/* Divider */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-cyber-cyan/30 to-transparent" />

            {/* ── State-based content ── */}
            <AnimatePresence mode="wait">

              {/* IDLE – show login prompt */}
              {step === STEP.IDLE && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="w-full flex flex-col items-center gap-5"
                >
                  <p className="text-center text-sm text-white/50 leading-relaxed">
                    Authenticate with your Google account to gain access to the network.
                  </p>

                  {/* Security badges */}
                  <div className="flex gap-3 flex-wrap justify-center">
                    {['256-bit TLS', 'Google SSO', 'MikroTik Auth'].map((badge) => (
                      <span
                        key={badge}
                        className="text-[10px] font-mono px-3 py-1 rounded-full border border-cyber-cyan/20 text-cyber-cyan/60 bg-cyber-cyan/5 tracking-wider"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>

                  {/* Google Sign-In button */}
                  <button
                    onClick={handleGoogleClick}
                    className="btn-google w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl cursor-pointer group"
                  >
                    <GoogleIcon />
                    <span className="text-sm font-semibold text-white/85 group-hover:text-white transition-colors">
                      Continue with Google
                    </span>
                  </button>

                  <p className="text-xs text-white/25 text-center">
                    Your identity is verified via Google OAuth&nbsp;2.0.
                    <br />Access is managed by MikroTik RouterOS User Manager.
                  </p>
                </motion.div>
              )}

              {/* GOOGLE – popup launched */}
              {step === STEP.GOOGLE && (
                <motion.div
                  key="google"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4"
                >
                  <SpinnerRing color="#00d4ff" />
                  <p className="font-orbitron text-sm tracking-widest text-cyber-cyan">
                    OPENING GOOGLE AUTH…
                  </p>
                </motion.div>
              )}

              {/* VERIFYING */}
              {step === STEP.VERIFYING && (
                <motion.div
                  key="verifying"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-5 w-full"
                >
                  <SpinnerRing color="#7c3aed" />
                  <div className="text-center">
                    <p className="font-orbitron text-sm tracking-widest text-cyber-purple mb-1">
                      VERIFYING IDENTITY
                    </p>
                    {userInfo && (
                      <p className="text-xs text-white/40 font-mono">{userInfo.email}</p>
                    )}
                  </div>
                  <ProgressBar />
                </motion.div>
              )}

              {/* AUTHORIZED */}
              {step === STEP.AUTHORIZED && (
                <motion.div
                  key="authorized"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="w-16 h-16 rounded-full bg-cyber-green/10 border border-cyber-green/40 flex items-center justify-center"
                    style={{ boxShadow: '0 0 30px rgba(0,255,136,0.3)' }}
                  >
                    <CheckIcon />
                  </motion.div>
                  <div className="text-center">
                    <p className="font-orbitron text-sm tracking-widest text-cyber-green mb-1">
                      ACCESS GRANTED
                    </p>
                    <p className="text-xs text-white/40 font-mono">{userInfo?.email}</p>
                  </div>
                  <p className="text-xs text-white/30">Connecting to network…</p>
                </motion.div>
              )}

              {/* REDIRECTING */}
              {step === STEP.REDIRECTING && (
                <motion.div
                  key="redirecting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-4"
                >
                  <SpinnerRing color="#00ff88" />
                  <p className="font-orbitron text-sm tracking-widest text-cyber-green">
                    ESTABLISHING SESSION…
                  </p>
                </motion.div>
              )}

              {/* DENIED */}
              {step === STEP.DENIED && (
                <motion.div
                  key="denied"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-5 w-full"
                >
                  <div
                    className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center"
                    style={{ boxShadow: '0 0 20px rgba(248,113,113,0.2)' }}
                  >
                    <DenyIcon />
                  </div>
                  <div className="text-center">
                    <p className="font-orbitron text-sm tracking-widest text-red-400 mb-2">
                      ACCESS DENIED
                    </p>
                    <p className="text-xs text-white/40 leading-relaxed">{errMsg}</p>
                  </div>
                  {userInfo && (
                    <p className="text-xs font-mono text-white/25">{userInfo.email}</p>
                  )}
                  <button
                    onClick={handleRetry}
                    className="btn-cyber px-6 py-2.5 rounded-lg text-xs text-cyber-cyan"
                  >
                    Try Different Account
                  </button>
                </motion.div>
              )}

              {/* ERROR */}
              {step === STEP.ERROR && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-5 w-full"
                >
                  <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
                    <WarnIcon />
                  </div>
                  <div className="text-center">
                    <p className="font-orbitron text-sm tracking-widest text-yellow-400 mb-2">
                      ERROR
                    </p>
                    <p className="text-xs text-white/40 leading-relaxed">{errMsg}</p>
                  </div>
                  <button
                    onClick={handleRetry}
                    className="btn-cyber px-6 py-2.5 rounded-lg text-xs text-cyber-cyan"
                  >
                    Retry
                  </button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Footer note */}
          <p className="text-center text-[10px] text-white/20 font-mono mt-4 tracking-wider">
            POWERED BY MIKROTIK ROUTEROS · SECURED BY GOOGLE OAUTH 2.0
          </p>
        </motion.div>
      </main>

      {/* Network info bar */}
      <div className="relative z-10">
        <NetworkBar mac={hotspot.mac} ip={hotspot.ip} />
      </div>
    </div>
  )
}

// ── Inline icon components ──────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function SpinnerRing({ color = '#00d4ff' }) {
  return (
    <div className="relative w-14 h-14">
      <svg className="animate-spin-slow" width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r="22" fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="6 4" opacity="0.3" />
      </svg>
      <svg className="absolute inset-0 animate-spin" style={{ animationDuration: '1.2s' }} width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r="22" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="30 110" strokeLinecap="round" />
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      >
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
      </div>
    </div>
  )
}

function ProgressBar() {
  return (
    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
      <motion.div
        className="progress-bar h-full rounded-full"
        initial={{ width: '0%' }}
        animate={{ width: '85%' }}
        transition={{ duration: 2.5, ease: 'easeInOut' }}
      />
    </div>
  )
}

function CheckIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M5 13l4 4L19 7" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DenyIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M18 6L6 18M6 6l12 12" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function WarnIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M12 9v4M12 17h.01" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#facc15" strokeWidth="2" fill="none" />
    </svg>
  )
}
