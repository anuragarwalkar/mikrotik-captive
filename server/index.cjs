'use strict'

const express   = require('express')
const Redis     = require('ioredis')
const cors      = require('cors')
const crypto    = require('crypto')
const https     = require('https')
const path      = require('path')
require('dotenv').config()

const app  = express()
const PORT = process.env.PORT || 3001

// ── Redis client ─────────────────────────────────────────────────────────────
// MikroTik User Manager or your own Redis instance
const redis = new Redis({
  host:     process.env.REDIS_HOST     || '127.0.0.1',
  port:     parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  tls:      process.env.REDIS_TLS === 'true' ? {} : undefined,
  lazyConnect: true,
})

redis.on('error', (err) => console.error('[Redis] connection error:', err.message))
redis.connect().catch((e) => console.error('[Redis] initial connect failed:', e.message))

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }))
app.use(express.json())

// Serve React build in production
app.use(express.static(path.join(__dirname, '..', 'dist')))

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Verify Google access token and return the user's email */
async function getEmailFromGoogleToken(accessToken) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      `https://www.googleapis.com/oauth2/v3/userinfo`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
      (res) => {
        let body = ''
        res.on('data', (chunk) => { body += chunk })
        res.on('end', () => {
          try {
            const json = JSON.parse(body)
            if (json.email) resolve(json.email)
            else reject(new Error('No email in token response'))
          } catch (e) { reject(e) }
        })
      }
    )
    req.on('error', reject)
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('Google API timeout')) })
  })
}

/** Check if an email is allowed (key pattern: allowed:email:<email>) */
async function isEmailAllowed(email) {
  const normalized = email.toLowerCase().trim()
  const exists = await redis.exists(`allowed:email:${normalized}`)
  return exists === 1
}

/** Call MikroTik REST API to create a temporary hotspot user */
async function createMikrotikHotspotUser(username, password, mac, ip) {
  const mikrotikBase = process.env.MIKROTIK_API_URL   // e.g. http://192.168.88.1
  const apiUser      = process.env.MIKROTIK_API_USER  || 'admin'
  const apiPass      = process.env.MIKROTIK_API_PASS  || ''

  if (!mikrotikBase) {
    // No MikroTik API configured — skip (useful for dev without a router)
    console.warn('[MikroTik] MIKROTIK_API_URL not set, skipping user creation')
    return
  }

  const auth = Buffer.from(`${apiUser}:${apiPass}`).toString('base64')
  const body = JSON.stringify({
    name:     username,
    password: password,
    profile:  process.env.MIKROTIK_HOTSPOT_PROFILE || 'default',
    comment:  `google-auth:${mac}:${new Date().toISOString()}`,
    // Limit by MAC so the credential only works for this device
    'mac-address': mac || '',
    // Auto-remove after session limit (optional)
    limit_uptime: process.env.HOTSPOT_SESSION_LIMIT || '8h',
  })

  await new Promise((resolve, reject) => {
    const url   = new URL('/rest/ip/hotspot/user/add', mikrotikBase)
    const isHttps = url.protocol === 'https:'
    const lib   = isHttps ? require('https') : require('http')

    const req = lib.request(
      {
        hostname: url.hostname,
        port:     url.port || (isHttps ? 443 : 80),
        path:     url.pathname,
        method:   'PUT',
        headers:  {
          Authorization:  `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        // Skip cert verification for self-signed RouterOS certs
        rejectUnauthorized: process.env.MIKROTIK_VERIFY_SSL === 'true',
      },
      (res) => {
        let data = ''
        res.on('data', (c) => { data += c })
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(data)
          else reject(new Error(`MikroTik API error ${res.statusCode}: ${data}`))
        })
      }
    )
    req.on('error', reject)
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('MikroTik API timeout')) })
    req.write(body)
    req.end()
  })
}

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/verify
 * Body: { email?, accessToken, mac, ip }
 * - Verifies the Google access token server-side
 * - Checks email against Redis allowed list
 * - Creates a temporary MikroTik hotspot user if authorized
 * - Returns: { authorized, username, password } or { authorized: false, message }
 */
app.post('/api/verify', async (req, res) => {
  try {
    const { accessToken, mac, ip } = req.body

    if (!accessToken) {
      return res.status(400).json({ authorized: false, message: 'Access token is required.' })
    }

    // 1. Verify token with Google — do NOT trust client-supplied email
    let email
    try {
      email = await getEmailFromGoogleToken(accessToken)
    } catch {
      return res.status(401).json({ authorized: false, message: 'Invalid or expired Google token.' })
    }

    // 2. Check Redis allowed list
    const allowed = await isEmailAllowed(email)
    if (!allowed) {
      return res.status(403).json({
        authorized: false,
        message: `${email} is not on the approved access list.`,
      })
    }

    // 3. Generate one-time credentials for MikroTik hotspot login
    const username = `gauth-${crypto.randomBytes(6).toString('hex')}`
    const password = crypto.randomBytes(12).toString('base64url')

    // 4. Create user in MikroTik (fire and forget errors — user sees success regardless)
    try {
      await createMikrotikHotspotUser(username, password, mac, ip)
    } catch (e) {
      console.error('[MikroTik] Failed to create hotspot user:', e.message)
      // Return error to client if MikroTik API is required
      if (process.env.MIKROTIK_API_URL) {
        return res.status(502).json({ authorized: false, message: 'Failed to provision network access. Try again.' })
      }
    }

    // 5. Optionally store session in Redis (for audit trail)
    await redis.setex(
      `session:${username}`,
      8 * 3600, // 8h TTL
      JSON.stringify({ email, mac, ip, createdAt: Date.now() })
    ).catch(() => {})

    return res.json({ authorized: true, username, password, email })
  } catch (err) {
    console.error('[/api/verify] Unexpected error:', err)
    return res.status(500).json({ authorized: false, message: 'Internal server error.' })
  }
})

/**
 * POST /api/admin/allow
 * Add an email to the Redis allowed list.
 * Protect this endpoint with ADMIN_SECRET in production.
 */
app.post('/api/admin/allow', async (req, res) => {
  const secret = req.headers['x-admin-secret']
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const { email } = req.body
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' })
  }
  const normalized = email.toLowerCase().trim()
  await redis.set(`allowed:email:${normalized}`, '1')
  return res.json({ ok: true, email: normalized })
})

/**
 * DELETE /api/admin/allow
 * Remove an email from the allowed list.
 */
app.delete('/api/admin/allow', async (req, res) => {
  const secret = req.headers['x-admin-secret']
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email required' })
  const normalized = email.toLowerCase().trim()
  await redis.del(`allowed:email:${normalized}`)
  return res.json({ ok: true, email: normalized })
})

/**
 * GET /api/admin/allowed
 * List all allowed emails.
 */
app.get('/api/admin/allowed', async (req, res) => {
  const secret = req.headers['x-admin-secret']
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const keys   = await redis.keys('allowed:email:*')
  const emails = keys.map((k) => k.replace('allowed:email:', ''))
  return res.json({ emails })
})

// SPA fallback — serve React for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`\n  [Server] Running on http://localhost:${PORT}`)
  console.log(`  [Redis]  ${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`)
  console.log(`  [Mikrotik] ${process.env.MIKROTIK_API_URL || '(not configured)'}`)
})
