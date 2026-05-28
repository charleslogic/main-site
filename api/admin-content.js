const { createClient } = require('@supabase/supabase-js')

// Temporary — replace with a Supabase profiles table role check when ready
const ADMIN_EMAILS = ['charles76012@gmail.com', 'charles76012@yahoo.com']

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

module.exports = async function handler(req, res) {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) return res.status(401).end()

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).end()
  if (!ADMIN_EMAILS.includes(user.email)) return res.status(403).end()

  res.setHeader('Content-Type', 'text/html')
  res.send(`
    <section style="background:#fff7e6;border:1px solid #f0d080;padding:1rem;border-radius:6px;margin-bottom:2rem">
      <h2>Admin</h2>
      <p>Admin-only content. Never in page source for anyone without a verified admin token.</p>
    </section>
  `)
}
