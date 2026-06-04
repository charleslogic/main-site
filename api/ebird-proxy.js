module.exports = async function handler(req, res) {
  const key = process.env.EBIRD_API_KEY;
  if (!key) return res.status(500).json({ error: 'EBIRD_API_KEY not configured' });

  const { lat, lng, dist = 15, back = 14, maxResults, mode } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

  const distVal = Math.min(50, Math.max(1, parseInt(dist) || 15));
  const backVal = Math.min(30, Math.max(1, parseInt(back) || 14));
  const base    = mode === 'notable' ? 'recent/notable' : 'recent';

  let url = `https://api.ebird.org/v2/data/obs/geo/${base}?lat=${lat}&lng=${lng}&dist=${distVal}&back=${backVal}`;
  if (maxResults) url += `&maxResults=${parseInt(maxResults)}`;

  try {
    const upstream = await fetch(url, { headers: { 'X-eBirdApiToken': key } });
    const body = await upstream.text();
    res.status(upstream.status)
       .setHeader('Content-Type', 'application/json')
       .send(body);
  } catch (e) {
    res.status(502).json({ error: 'eBird API unavailable' });
  }
};
