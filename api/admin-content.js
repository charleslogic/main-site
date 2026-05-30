const { createClient } = require('@supabase/supabase-js')

// Temporary — replace with a Supabase profiles table role check when ready.
// Stored lowercase; the request email is lowercased before comparison.
const ADMIN_EMAILS = ['charles76012@gmail.com']

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

module.exports = async function handler(req, res) {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) return res.status(401).end()

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).end()

  // Admin requires a CONFIRMED email that is on the allowlist. Requiring
  // email_confirmed_at blocks any unverified signup from matching the admin
  // address on the shared Supabase project.
  const email = (user.email || '').toLowerCase()
  if (!user.email_confirmed_at || !ADMIN_EMAILS.includes(email)) {
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
