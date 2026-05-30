const { createClient } = require('@supabase/supabase-js')

// Admin is identified by the immutable Supabase user id (UUID), set as
// ADMIN_USER_ID in the Vercel env — same pattern as TrailView's TV_ADMIN_USER_ID.
// This is unspoofable and can't drift the way an email allowlist can (a stray
// or unverified email address could otherwise match). Fail-closed: if the env
// var is unset, no one is admin.
const ADMIN_USER_ID = process.env.ADMIN_USER_ID || ''

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

module.exports = async function handler(req, res) {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) return res.status(401).end()

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).end()

  if (!ADMIN_USER_ID || user.id !== ADMIN_USER_ID) {
    return res.status(403).end()
  }

  res.setHeader('Content-Type', 'text/html')
  res.send(`
    <div style="margin-top:10px;">
      <div style="font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;">Admin</div>
      <section style="background:#18181b;border:1px solid #3f3f46;padding:20px;border-radius:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <p style="margin:0;font-size:0.9rem;color:#a1a1aa;">Admin-only content. Never in page source for anyone without a verified admin token.</p>
      </section>
    </div>
  `)
}
