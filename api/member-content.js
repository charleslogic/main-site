const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

module.exports = async function handler(req, res) {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) return res.status(401).end()

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).end()

  const email = user.email.replace(/</g, '&lt;')

  res.setHeader('Content-Type', 'text/html')
  res.send(`
    <section style="background:#f0f7ff;border:1px solid #c0d8f0;padding:1rem;border-radius:6px;margin-bottom:2rem">
      <h2>Member Area</h2>
      <p>Welcome, ${email}. This content was never in the page source — it was fetched after your token was verified server-side.</p>
    </section>
  `)
}
