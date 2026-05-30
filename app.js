// CharlesLogic main site — auth + protected content loader.
// Extracted from an inline <script type="module"> so the page can run under a
// strict Content-Security-Policy (no 'unsafe-inline' scripts).
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.106.2/+esm'

const SUPABASE_URL      = 'https://nfvxmkknkxysjksyhbek.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_Lju5epgXoT5HFOoyZdjGYw_ksPesDaB'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const savedTheme = localStorage.getItem('cl-theme') || 'dark'
document.documentElement.dataset.theme = savedTheme
document.getElementById('theme-toggle').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
  document.documentElement.dataset.theme = next
  localStorage.setItem('cl-theme', next)
})

const dropdownEl = document.getElementById('auth-dropdown')
document.getElementById('user-icon-btn').addEventListener('click', e => {
  e.stopPropagation()
  dropdownEl.hidden = !dropdownEl.hidden
})
document.addEventListener('click', e => {
  if (!document.getElementById('user-menu-wrap').contains(e.target)) dropdownEl.hidden = true
})

async function loadProtectedContent(session) {
  const headers = { Authorization: `Bearer ${session.access_token}` }
  const [memberRes, adminRes] = await Promise.all([
    fetch('/api/member-content', { headers }),
    fetch('/api/admin-content',  { headers })
  ])
  if (memberRes.ok) document.getElementById('member-slot').innerHTML = await memberRes.text()
  if (adminRes.ok)  document.getElementById('admin-slot').innerHTML  = await adminRes.text()
}

function clearProtectedContent() {
  document.getElementById('member-slot').innerHTML = ''
  document.getElementById('admin-slot').innerHTML  = ''
}

let otpEmail = ''

function resetOtpState() {
  document.getElementById('otp-email-step').hidden     = false
  document.getElementById('otp-code-step').hidden      = true
  document.getElementById('input-email').value         = ''
  document.getElementById('input-code').value          = ''
  document.getElementById('btn-send-code').disabled    = false
  document.getElementById('btn-send-code').textContent = 'Send code'
  document.getElementById('auth-message').textContent  = ''
  otpEmail = ''
}

function render(session) {
  const loggedIn = !!session?.user
  const email    = session?.user?.email || ''
  document.getElementById('user-btn-label').textContent = loggedIn ? email.split('@')[0] : 'Sign in'
  document.getElementById('dropdown-login').hidden = loggedIn
  document.getElementById('dropdown-user').hidden  = !loggedIn
  if (loggedIn) {
    document.getElementById('dropdown-user-email').textContent = email
    loadProtectedContent(session)
  } else {
    clearProtectedContent()
    resetOtpState()
  }
}

const { data: { session } } = await supabase.auth.getSession()
render(session)
supabase.auth.onAuthStateChange((_event, session) => render(session))

const redirectTo = window.location.origin + window.location.pathname

document.getElementById('btn-google').addEventListener('click', () =>
  supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, queryParams: { prompt: 'select_account' } } })
)

document.getElementById('btn-send-code').addEventListener('click', async () => {
  const email = document.getElementById('input-email').value.trim()
  if (!email) return
  const btn = document.getElementById('btn-send-code')
  btn.disabled = true; btn.textContent = 'Sending…'
  document.getElementById('auth-message').textContent = ''
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
  if (error) {
    document.getElementById('auth-message').textContent = error.message
    btn.disabled = false; btn.textContent = 'Send code'
    return
  }
  otpEmail = email
  document.getElementById('otp-email-step').hidden = true
  document.getElementById('otp-code-step').hidden  = false
  document.getElementById('input-code').focus()
})

document.getElementById('input-email').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-send-code').click()
})

document.getElementById('btn-verify-code').addEventListener('click', async () => {
  const code = document.getElementById('input-code').value.trim()
  if (!code) return
  const btn = document.getElementById('btn-verify-code')
  btn.disabled = true; btn.textContent = 'Verifying…'
  document.getElementById('auth-message').textContent = ''
  const { error } = await supabase.auth.verifyOtp({ email: otpEmail, token: code, type: 'email' })
  if (error) {
    document.getElementById('auth-message').textContent = 'Invalid or expired code.'
    btn.disabled = false; btn.textContent = 'Sign in'
  } else {
    dropdownEl.hidden = true
  }
})

document.getElementById('input-code').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-verify-code').click()
})

document.getElementById('btn-otp-back').addEventListener('click', () => {
  document.getElementById('otp-code-step').hidden  = true
  document.getElementById('otp-email-step').hidden = false
  document.getElementById('input-code').value = ''
  document.getElementById('auth-message').textContent = ''
})

document.getElementById('btn-logout').addEventListener('click', async () => {
  await supabase.auth.signOut()
  dropdownEl.hidden = true
})
