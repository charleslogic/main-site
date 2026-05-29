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
    <div style="margin-top:28px;">
      <div style="font-family:'Courier New',monospace;font-size:0.68rem;color:#fbbf24;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px;opacity:0.8;">▸ member</div>
      <section style="background:#1e293b;border:1px solid #334155;padding:18px;border-radius:10px;color:#cbd5e1;font-family:'Segoe UI',Roboto,sans-serif;">
        <div style="font-family:'Courier New',monospace;font-size:0.85rem;color:#4ade80;margin-bottom:6px;">[ACCESS_GRANTED]</div>
        <p style="margin:0;font-size:0.9rem;">Welcome, ${email}. This content was fetched server-side after token verification.</p>
      </section>
    </div>
  `)
}
