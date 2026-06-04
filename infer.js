// ── Model registry ────────────────────────────────────────────────────────────
const OR_MODELS = [
  { id: 'openai/gpt-oss-120b:free',              name: 'GPT-OSS 120B',  provider: 'OpenAI' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 120B', provider: 'NVIDIA' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B', provider: 'Meta'   },
];
const DIRECT_MODELS = [
  { id: 'gemini-2.5-flash',        name: 'Gemini 2.5 Flash', provider: 'Google',   via: 'gemini'   },
  { id: 'gpt-oss-120b',            name: 'Cerebras 120B',    provider: 'Cerebras', via: 'cerebras' },
  { id: 'llama-3.3-70b-versatile', name: 'Groq Llama 3.3',  provider: 'Groq',     via: 'groq'     },
];
const ALL_MODELS = [...OR_MODELS.map(m => ({...m, via: 'openrouter'})), ...DIRECT_MODELS];

let activeModels = new Set([
  'openai/gpt-oss-120b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'gpt-oss-120b',
  'llama-3.3-70b-versatile',
]);

// Per-model conversation history { modelId: [{role, content}] }
const history = {};
const getHistory = id => (history[id] = history[id] || []);

// ── DOM refs ──────────────────────────────────────────────────────────────────
const togglesEl   = document.getElementById('model-toggles');
const panelsWrap  = document.getElementById('panels-wrap');
const askBtn      = document.getElementById('ask-btn');
const newChatBtn  = document.getElementById('new-chat-btn');
const questionEl  = document.getElementById('question-input');
const contextEl   = document.getElementById('context-input');
const statusEl    = document.getElementById('status-msg');
const loadBirdsBtn = document.getElementById('load-birds-btn');

// ── Keys collapsible ──────────────────────────────────────────────────────────
(function initKeysToggle() {
  const bar      = document.getElementById('keys-bar');
  const toggleBar = document.getElementById('keys-toggle-bar');
  const chevron  = document.getElementById('keys-chevron');
  const hint     = document.getElementById('keys-status');
  let open = localStorage.getItem('infer-keys-open') === '1';

  function apply() {
    bar.classList.toggle('collapsed', !open);
    chevron.classList.toggle('open', open);
    hint.textContent = open ? 'tap to hide' : 'tap to expand';
    toggleBar.setAttribute('aria-expanded', open);
    localStorage.setItem('infer-keys-open', open ? '1' : '0');
  }
  toggleBar.addEventListener('click', () => { open = !open; apply(); });
  apply();
})();

// ── UI helpers ────────────────────────────────────────────────────────────────
function panelEls(id) {
  const p = document.getElementById('panel-' + id.replace(/[^a-z0-9]/gi, '_'));
  return p ? { body: p.querySelector('.panel-body'), meta: p.querySelector('.panel-meta') } : {};
}

function appendMsgEl(bodyEl, role, content) {
  if (!bodyEl) return null;
  const idle = bodyEl.querySelector('.idle-text');
  if (idle) idle.remove();
  const el = document.createElement('div');
  el.className = 'msg-' + role;
  if (role === 'assistant') {
    el.innerHTML = typeof marked !== 'undefined' ? marked.parse(content) : content;
  } else {
    el.textContent = content;
  }
  bodyEl.appendChild(el);
  bodyEl.scrollTop = bodyEl.scrollHeight;
  return el;
}

function beginAssistantMsg(id) {
  const { body } = panelEls(id);
  if (!body) return null;
  const idle = body.querySelector('.idle-text');
  if (idle) idle.remove();
  const el = document.createElement('div');
  el.className = 'msg-thinking';
  el.textContent = 'thinking…';
  body.appendChild(el);
  body.scrollTop = body.scrollHeight;
  return el;
}

function finalizeMsg(el, id, content, isError) {
  if (!el) return;
  const { body } = panelEls(id);
  el.className = isError ? 'msg-error' : 'msg-assistant';
  if (!isError && typeof marked !== 'undefined') {
    el.innerHTML = marked.parse(content);
  } else {
    el.textContent = content;
  }
  if (body) body.scrollTop = body.scrollHeight;
}

function setMeta(id, text) {
  const { meta } = panelEls(id);
  if (meta) meta.textContent = text;
}

// ── Panel / toggle builders ───────────────────────────────────────────────────
function buildToggles() {
  togglesEl.innerHTML = '<span style="font-size:10px;color:var(--text-faint);margin-right:2px;">via OpenRouter:</span>';
  OR_MODELS.forEach(m => {
    const btn = document.createElement('button');
    btn.className = 'model-toggle' + (activeModels.has(m.id) ? ' active' : '');
    btn.textContent = m.name; btn.dataset.id = m.id;
    btn.addEventListener('click', () => toggleModel(m.id, btn));
    togglesEl.appendChild(btn);
  });
  const sep = document.createElement('span');
  sep.className = 'section-sep'; sep.textContent = '| direct:';
  togglesEl.appendChild(sep);
  DIRECT_MODELS.forEach(m => {
    const btn = document.createElement('button');
    btn.className = 'model-toggle direct-model' + (activeModels.has(m.id) ? ' active' : '');
    btn.textContent = m.name; btn.dataset.id = m.id;
    btn.addEventListener('click', () => toggleModel(m.id, btn));
    togglesEl.appendChild(btn);
  });
}

function toggleModel(id, btn) {
  if (activeModels.has(id)) { if (activeModels.size > 1) { activeModels.delete(id); btn.classList.remove('active'); } }
  else { activeModels.add(id); btn.classList.add('active'); }
  buildPanels();
}

function buildPanels() {
  panelsWrap.innerHTML = '';
  ALL_MODELS.filter(m => activeModels.has(m.id)).forEach(m => {
    const viaTxt = m.via === 'openrouter' ? 'OpenRouter' : 'direct';

    // header
    const header = document.createElement('div');
    header.className = 'panel-header';
    const nameEl = document.createElement('div');
    nameEl.className = 'panel-name';
    nameEl.textContent = m.name;
    const provEl = document.createElement('div');
    provEl.className = 'panel-provider';
    provEl.textContent = m.provider + ' ';
    const badge = document.createElement('span');
    badge.className = 'via-badge';
    badge.textContent = viaTxt;
    provEl.appendChild(badge);
    header.appendChild(nameEl);
    header.appendChild(provEl);

    // body
    const body = document.createElement('div');
    body.className = 'panel-body';
    const hist = getHistory(m.id);
    if (hist.length) {
      hist.forEach(msg => appendMsgEl(body, msg.role, msg.content));
    } else {
      body.innerHTML = '<span class="idle-text">waiting…</span>';
    }

    // expand row
    const expandRow = document.createElement('div');
    expandRow.className = 'panel-expand-row';
    expandRow.textContent = '↗ expand';
    expandRow.addEventListener('click', () => openOverlay(m.id));

    // meta
    const meta = document.createElement('div');
    meta.className = 'panel-meta';

    // assemble panel
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.id = 'panel-' + m.id.replace(/[^a-z0-9]/gi, '_');
    panel.appendChild(header);
    panel.appendChild(body);
    panel.appendChild(expandRow);
    panel.appendChild(meta);
    panelsWrap.appendChild(panel);
  });
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt() {
  const ctx = contextEl.value.trim();
  return ctx
    ? `You are a helpful birding assistant for the NAM app.\n\nContext:\n${ctx}\n\nAnswer concisely based on this context.`
    : 'You are a helpful birding assistant for the NAM app. Answer concisely.';
}

// ── Query functions (all return reply string | null) ──────────────────────────
async function queryOpenRouter(model, messages) {
  const key = document.getElementById('key-or').value.trim();
  if (!key) { const el = beginAssistantMsg(model.id); finalizeMsg(el, model.id, 'No OpenRouter key.', true); return null; }
  const start = Date.now();
  let fullResponse = '';
  const el = beginAssistantMsg(model.id);
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key,
        'HTTP-Referer': 'https://charleslogic.com',
        'X-Title': 'NAM Provider Comparator',
      },
      body: JSON.stringify({ model: model.id, messages, max_tokens: 1024, temperature: 0.7, stream: true }),
    });
    if (!res.ok) {
      let msg;
      if      (res.status === 402) msg = '402: Model requires a credit balance on OpenRouter.';
      else if (res.status === 429) msg = '429: Rate limited — try again in a moment.';
      else {
        try { const d = await res.json(); msg = `HTTP ${res.status}: ${d.error?.message || JSON.stringify(d)}`; }
        catch { msg = 'HTTP ' + res.status; }
      }
      finalizeMsg(el, model.id, msg, true); return null;
    }
    if (el) { el.className = 'msg-assistant'; el.textContent = ''; }
    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    const { body } = panelEls(model.id);
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value).split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const ds = line.slice(6).trim();
        if (ds === '[DONE]') break;
        try {
          const content = JSON.parse(ds).choices?.[0]?.delta?.content;
          if (content) { fullResponse += content; if (el) el.textContent = fullResponse; }
        } catch {}
      }
      if (body) body.scrollTop = body.scrollHeight;
    }
    if (el && typeof marked !== 'undefined') el.innerHTML = marked.parse(fullResponse);
    if (panelEls(model.id).body) panelEls(model.id).body.scrollTop = 9999;
    setMeta(model.id, ((Date.now() - start) / 1000).toFixed(1) + 's');
    return fullResponse || null;
  } catch(e) { finalizeMsg(el, model.id, 'Streaming error: ' + e.message, true); return null; }
}

async function queryGemini(model, messages, attempt = 1, existingEl = null) {
  const key = document.getElementById('key-gemini').value.trim();
  if (!key) { finalizeMsg(beginAssistantMsg(model.id), model.id, 'No Gemini key.', true); return null; }
  const start = Date.now();
  const el = existingEl || beginAssistantMsg(model.id);
  const contents = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }],
  }));
  const sysMsg = messages.find(m => m.role === 'system');
  const reqBody = { contents, generationConfig: { maxOutputTokens: 4096, temperature: 0.7 } };
  if (sysMsg) reqBody.systemInstruction = { parts: [{ text: sysMsg.content }] };
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${key}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reqBody) }
    );
    const data = await res.json();
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    if (!res.ok) {
      const msg = data.error?.message || String(res.status);
      if (res.status !== 429) { finalizeMsg(el, model.id, `${res.status}: ${msg.split('.')[0]}`, true); return null; }
      const retryMatch = msg.match(/retry in ([0-9.]+)s/i);
      const limitMatch = msg.match(/limit:\s*([0-9]+)/gi) || [];
      const waitSec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : null;
      if (limitMatch.some(m => /limit:\s*0\b/.test(m))) {
        finalizeMsg(el, model.id, `No free quota for ${model.id}. Enable billing at aistudio.google.com.`, true);
        return null;
      }
      if (waitSec !== null && waitSec <= 90 && attempt === 1) {
        return new Promise(resolve => {
          const tick = r => {
            if (el) { el.className = 'msg-thinking'; el.textContent = `RPM limit — retrying in ${r}s…`; }
            if (r > 0) setTimeout(() => tick(r - 1), 1000);
            else queryGemini(model, messages, 2, el).then(resolve);
          };
          tick(waitSec);
        });
      }
      const limits = limitMatch.map(m => parseInt(m.replace(/\D/g, ''))).filter(n => n > 0);
      const cap = limits.length ? Math.max(...limits) : null;
      finalizeMsg(el, model.id, `Daily quota hit${cap ? ' (' + cap + '/day)' : ''}. Try again tomorrow.`, true);
      return null;
    }
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '(no response)';
    const tokens = data.usageMetadata?.candidatesTokenCount;
    finalizeMsg(el, model.id, reply, false);
    setMeta(model.id, (tokens ? tokens + ' tok · ' : '') + elapsed + 's');
    return reply;
  } catch(e) { finalizeMsg(el, model.id, 'Network error: ' + e.message, true); return null; }
}

async function queryCerebras(model, messages) {
  const key = document.getElementById('key-cerebras').value.trim();
  if (!key) { finalizeMsg(beginAssistantMsg(model.id), model.id, 'No Cerebras key.', true); return null; }
  const start = Date.now();
  const el = beginAssistantMsg(model.id);
  try {
    const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({ model: model.id, messages, max_tokens: 4096, temperature: 0.7 }),
    });
    const data = await res.json();
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    if (!res.ok) { finalizeMsg(el, model.id, 'Error: ' + (data.error?.message || res.status), true); return null; }
    const reply = data.choices?.[0]?.message?.content || '(no response)';
    const tokens = data.usage?.completion_tokens;
    finalizeMsg(el, model.id, reply, false);
    setMeta(model.id, (tokens ? tokens + ' tok · ' : '') + elapsed + 's  ⚡ Cerebras');
    return reply;
  } catch(e) { finalizeMsg(el, model.id, 'Network error: ' + e.message, true); return null; }
}

async function queryGroq(model, messages) {
  const key = document.getElementById('key-groq').value.trim();
  if (!key) { finalizeMsg(beginAssistantMsg(model.id), model.id, 'No Groq key.', true); return null; }
  const start = Date.now();
  const el = beginAssistantMsg(model.id);
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({ model: model.id, messages, max_tokens: 4096, temperature: 0.7 }),
    });
    const data = await res.json();
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    if (!res.ok) { finalizeMsg(el, model.id, 'Error: ' + (data.error?.message || res.status), true); return null; }
    const reply = data.choices?.[0]?.message?.content || '(no response)';
    const tokens = data.usage?.completion_tokens;
    finalizeMsg(el, model.id, reply, false);
    setMeta(model.id, (tokens ? tokens + ' tok · ' : '') + elapsed + 's  🚀 Groq');
    return reply;
  } catch(e) { finalizeMsg(el, model.id, 'Network error: ' + e.message, true); return null; }
}

// ── Main orchestrator ─────────────────────────────────────────────────────────
async function askAll() {
  const question = questionEl.value.trim();
  if (!question) return;
  askBtn.disabled = true;
  questionEl.value = '';
  autoResize(questionEl);

  const active = ALL_MODELS.filter(m => activeModels.has(m.id));
  const sysmsg = { role: 'system', content: buildSystemPrompt() };

  active.forEach(m => {
    appendMsgEl(panelEls(m.id).body, 'user', question);
    getHistory(m.id).push({ role: 'user', content: question });
  });

  const turn = Math.max(...active.map(m => Math.ceil(getHistory(m.id).length / 2)));
  statusEl.textContent = `turn ${turn} · querying ${active.length} models…`;

  await Promise.all(active.map(async m => {
    const messages = [sysmsg, ...getHistory(m.id)];
    let reply = null;
    try {
      if      (m.via === 'gemini')    reply = await queryGemini(m, messages);
      else if (m.via === 'cerebras') reply = await queryCerebras(m, messages);
      else if (m.via === 'groq')     reply = await queryGroq(m, messages);
      else                           reply = await queryOpenRouter(m, messages);
    } catch(err) {
      finalizeMsg(beginAssistantMsg(m.id), m.id, 'Error: ' + err.message, true);
    }
    if (reply) {
      getHistory(m.id).push({ role: 'assistant', content: reply });
    } else {
      getHistory(m.id).pop();
    }
  }));

  statusEl.textContent = `turn ${turn} · done ✓`;
  askBtn.disabled = false;
}

function newConversation() {
  ALL_MODELS.forEach(m => { history[m.id] = []; });
  buildPanels();
  questionEl.value = '';
  statusEl.textContent = 'new conversation';
  autoResize(questionEl);
}

// ── Load nearby birds (iNat + eBird) ─────────────────────────────────────────
function timeSince(dateStr) {
  if (!dateStr) return 'recently';
  const h = Math.floor((Date.now() - new Date(dateStr)) / 3600000);
  if (h < 1)  return 'today';
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

// Distance in miles between two lat/lng points (haversine)
function distMi(lat1, lng1, lat2, lng2) {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
          + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
          * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Cardinal direction from point 1 → point 2
function cardDir(lat1, lng1, lat2, lng2) {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180)
           - Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLng);
  const b = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  return ['N','NE','E','SE','S','SW','W','NW'][Math.round(b / 45) % 8];
}

// "2.3mi NE" label, or empty string if coords missing
function locLabel(userLat, userLng, obsLat, obsLng) {
  if (obsLat == null || obsLng == null) return '';
  const d = distMi(userLat, userLng, obsLat, obsLng);
  const dir = cardDir(userLat, userLng, obsLat, obsLng);
  return ` | ${d < 0.1 ? '<0.1' : d.toFixed(1)}mi ${dir}`;
}

async function loadNearbyBirds() {
  loadBirdsBtn.disabled = true;
  loadBirdsBtn.textContent = '⏳ locating…';
  try {
    const pos = await new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 12000 })
    );
    const lat = pos.coords.latitude.toFixed(4);
    const lng = pos.coords.longitude.toFixed(4);
    loadBirdsBtn.textContent = '⏳ fetching…';

    const maxInat  = parseInt(document.getElementById('cfg-max-inat').value)  || 0;
    const maxEbird = parseInt(document.getElementById('cfg-max-ebird').value) || 0;

    const d1 = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const INAT_KM  = 48;
    const EBIRD_KM = 50;
    const inatBase = `https://api.inaturalist.org/v1/observations?taxon_id=3&lat=${lat}&lng=${lng}&radius=${INAT_KM}&per_page=200&order_by=observed_on&d1=${d1}`;

    // Fetch iNat page 1 + both eBird endpoints in parallel
    const [inatPage1, recentRes, notableRes] = await Promise.allSettled([
      fetch(inatBase + '&page=1').then(r => r.ok ? r.json() : Promise.reject('iNat ' + r.status)),
      fetch(`/api/ebird-proxy?lat=${lat}&lng=${lng}&dist=${EBIRD_KM}&back=7&maxResults=10000&mode=recent`)
        .then(r => r.ok ? r.json() : Promise.reject('eBird recent ' + r.status)),
      fetch(`/api/ebird-proxy?lat=${lat}&lng=${lng}&dist=${EBIRD_KM}&back=7&maxResults=10000&mode=notable`)
        .then(r => r.ok ? r.json() : Promise.reject('eBird notable ' + r.status)),
    ]);

    // iNat — paginate remaining pages
    let inatObs   = inatPage1.status === 'fulfilled' ? (inatPage1.value?.results ?? []) : [];
    const inatTotal = inatPage1.status === 'fulfilled' ? (inatPage1.value?.total_results ?? inatObs.length) : 0;
    const inatErr   = inatPage1.status === 'rejected'  ? ` ⚠️ ${inatPage1.reason}` : '';
    if (inatPage1.status === 'fulfilled' && inatTotal > 200) {
      const extraPages = Math.min(9, Math.ceil(inatTotal / 200) - 1);
      const pageResults = await Promise.allSettled(
        Array.from({ length: extraPages }, (_, i) =>
          fetch(`${inatBase}&page=${i + 2}`).then(r => r.ok ? r.json() : Promise.reject())
        )
      );
      pageResults.forEach(r => {
        if (r.status === 'fulfilled') inatObs = inatObs.concat(r.value?.results ?? []);
      });
    }

    // Filter broad-rank IDs and sort by distance
    const BROAD_RANKS = new Set(['kingdom','phylum','class','subclass','order','superorder']);
    const inatFiltered = inatObs
      .filter(o => !BROAD_RANKS.has(o.taxon?.rank))
      .map(o => {
        const rawLoc = o.location ? o.location.split(',') : null;
        const oLat   = (rawLoc && !o.obscured) ? parseFloat(rawLoc[0]) : null;
        const oLng   = (rawLoc && !o.obscured) ? parseFloat(rawLoc[1]) : null;
        const d      = oLat != null ? distMi(parseFloat(lat), parseFloat(lng), oLat, oLng) : Infinity;
        return { o, oLat, oLng, d };
      })
      .sort((a, b) => a.d - b.d);

    const inatShown = maxInat > 0 ? inatFiltered.slice(0, maxInat) : inatFiltered;
    const limitNote = maxInat > 0 && inatFiltered.length > maxInat ? ` · showing ${maxInat}` : '';

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    let text = `YOUR LOCATION: ${lat}, ${lng} — ${new Date().toLocaleTimeString()}\n\n`;

    text += `🦋 iNaturalist – last 7d, 30mi radius (${inatTotal} obs · ${inatShown.length} shown · nearest first${limitNote}${inatErr})\n`;
    if (inatShown.length) {
      inatShown.forEach(({ o, oLat, oLng }) => {
        const common   = o.taxon?.preferred_common_name || o.taxon?.name || 'Unknown';
        const sci      = o.taxon?.name ?? '';
        const label    = sci && sci !== common ? `${common} (${sci})` : common;
        const when     = timeSince(o.observed_on || o.time_observed_at);
        const dist     = o.obscured ? ' | ~obscured' : locLabel(userLat, userLng, oLat, oLng);
        const place    = o.place_guess ? ` (${o.place_guess})` : '';
        const observer = o.user?.name || o.user?.login;
        const who      = observer ? ` [@${observer}]` : '';
        text += `• ${label} — ${when}${dist}${place}${who}\n`;
      });
    } else {
      text += `• ${inatPage1.status === 'rejected' ? 'Fetch failed' : 'No observations found'}\n`;
    }

    text += '\n';

    // eBird — notable always all; recent limited by maxEbird
    const ebirdRecent  = recentRes.status  === 'fulfilled' && Array.isArray(recentRes.value)  ? recentRes.value  : [];
    const ebirdNotable = notableRes.status === 'fulfilled' && Array.isArray(notableRes.value) ? notableRes.value : [];
    const notableCodes = new Set(ebirdNotable.map(o => o.speciesCode));

    // Dedup by subId+speciesCode: same checklist entry in both recent and notable counts once
    const recentKeys = new Set(ebirdRecent.map(o => `${o.subId}|${o.speciesCode}`));
    const combined = [
      ...ebirdRecent,
      ...ebirdNotable.filter(o => !recentKeys.has(`${o.subId}|${o.speciesCode}`)),
    ];
    combined.sort((a, b) =>
      (notableCodes.has(b.speciesCode) ? 1 : 0) - (notableCodes.has(a.speciesCode) ? 1 : 0)
      || (a.comName ?? '').localeCompare(b.comName ?? '')
    );
    const ebirdShown   = maxEbird > 0 ? combined.slice(0, maxEbird) : combined;
    const ebirdLimitNote = maxEbird > 0 && combined.length > maxEbird ? ` · showing ${maxEbird}` : '';

    const ebirdFail = recentRes.status === 'rejected' ? ` ⚠️ ${recentRes.reason}` : '';
    text += `🐦 eBird – last 7d, ~30mi radius (${combined.length} entries, ${ebirdNotable.length} notable${ebirdLimitNote}${ebirdFail})\n`;
    if (ebirdShown.length) {
      ebirdShown.forEach(o => {
        const name   = o.comName || o.sciName || 'Unknown';
        const count  = o.howMany ? ` — ${o.howMany} seen` : '';
        const dist   = locLabel(userLat, userLng, o.lat, o.lng);
        const place  = o.locName ? ` (${o.locName})` : '';
        const marker = notableCodes.has(o.speciesCode) ? '⭐ ' : '• ';
        text += `${marker}${name}${count}${dist}${place}\n`;
      });
    } else {
      text += `• ${recentRes.status === 'rejected' ? 'Fetch failed' : 'No observations found'}\n`;
    }

    contextEl.value = text.trim();
    contextEl.style.height = 'auto';
    contextEl.style.height = Math.min(contextEl.scrollHeight, 120) + 'px';

  } catch(e) {
    contextEl.value = e.code === 1
      ? 'Location access denied. Allow location in your browser settings.'
      : 'Could not load bird data: ' + e.message;
  } finally {
    loadBirdsBtn.disabled = false;
    loadBirdsBtn.textContent = '📍 Load nearby birds';
  }
}

// ── Expand overlay ───────────────────────────────────────────────────────────
function openOverlay(modelId) {
  const model = ALL_MODELS.find(m => m.id === modelId);
  if (!model) return;
  const viaTxt = model.via === 'openrouter' ? 'OpenRouter' : 'direct';
  document.getElementById('overlay-title').textContent = model.name;
  document.getElementById('overlay-provider-badge').textContent = model.provider + ' · ' + viaTxt;
  const overlayBody = document.getElementById('overlay-body');
  overlayBody.innerHTML = '';
  const { body, meta } = panelEls(modelId);
  if (body) {
    [...body.children].forEach(child => {
      overlayBody.appendChild(child.cloneNode(true));
    });
  }
  document.getElementById('overlay-meta').textContent = meta?.textContent ?? '';
  const overlay = document.getElementById('panel-overlay');
  overlay.classList.add('open');
  overlayBody.scrollTop = overlayBody.scrollHeight;
  document.body.style.overflow = 'hidden';
}

function closeOverlay() {
  document.getElementById('panel-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('panel-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeOverlay();
});
document.getElementById('overlay-close').addEventListener('click', closeOverlay);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeOverlay(); });

// ── Theme toggle ──────────────────────────────────────────────────────────────
(function initTheme() {
  const btn = document.getElementById('theme-btn');
  const html = document.documentElement;
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let dark = localStorage.getItem('infer-theme')
    ? localStorage.getItem('infer-theme') === 'dark'
    : systemDark;

  function apply() {
    html.setAttribute('data-theme', dark ? 'dark' : 'light');
    btn.textContent = dark ? '☀️ light' : '🌙 dark';
    localStorage.setItem('infer-theme', dark ? 'dark' : 'light');
  }
  btn.addEventListener('click', () => { dark = !dark; apply(); });
  apply();
})();

// ── Boot ──────────────────────────────────────────────────────────────────────
function autoResize(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; }

questionEl.addEventListener('input', () => autoResize(questionEl));
questionEl.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askAll(); }
});
askBtn.addEventListener('click', askAll);
newChatBtn.addEventListener('click', newConversation);
loadBirdsBtn.addEventListener('click', loadNearbyBirds);

buildToggles();
buildPanels();

// Restore and persist load-config inputs
(function initLoadConfig() {
  const inatEl  = document.getElementById('cfg-max-inat');
  const ebirdEl = document.getElementById('cfg-max-ebird');
  const saved   = k => localStorage.getItem(k);
  if (saved('infer-max-inat'))  inatEl.value  = saved('infer-max-inat');
  if (saved('infer-max-ebird')) ebirdEl.value = saved('infer-max-ebird');
  inatEl.addEventListener('input',  () => localStorage.setItem('infer-max-inat',  inatEl.value));
  ebirdEl.addEventListener('input', () => localStorage.setItem('infer-max-ebird', ebirdEl.value));
})();

// Populate API key inputs from server env vars
fetch('/api/infer-keys').then(r => r.ok ? r.json() : {}).then(k => {
  if (k.openrouter) document.getElementById('key-or').value = k.openrouter;
  if (k.gemini)     document.getElementById('key-gemini').value = k.gemini;
  if (k.cerebras)   document.getElementById('key-cerebras').value = k.cerebras;
  if (k.groq)       document.getElementById('key-groq').value = k.groq;
}).catch(() => {});
