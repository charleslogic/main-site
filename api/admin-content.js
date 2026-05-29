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
    <div style="margin-top:16px;">
      <div style="font-family:'Courier New',monospace;font-size:0.68rem;color:#4ade80;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px;opacity:0.8;">▸ admin</div>
      <section style="background:#1e293b;border:1px solid #4ade80;padding:18px;border-radius:10px;color:#cbd5e1;font-family:'Segoe UI',Roboto,sans-serif;">
        <div style="font-family:'Courier New',monospace;font-size:0.85rem;color:#4ade80;margin-bottom:6px;">[ADMIN_ACCESS]</div>
        <p style="margin:0;font-size:0.9rem;">Admin-only content. Never in page source for anyone without a verified admin token.</p>
      </section>
    </div>
  `)
}
