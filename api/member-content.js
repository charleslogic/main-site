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
      <div style="font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;">Members</div>
      <section style="background:#18181b;border:1px solid #27272a;padding:20px;border-radius:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <p style="margin:0;font-size:0.9rem;color:#a1a1aa;">Welcome, <strong style="color:#fafafa;">${email}</strong>. This content is fetched server-side after token verification.</p>
      </section>
    </div>
  `)
}
