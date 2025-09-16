// GET /api/slots?start=YYYY-MM-DD&end=YYYY-MM-DD&timeZone=Europe/Oslo&eventTypeId=123
//  eller  &username=<name>&eventTypeSlug=<slug>
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { start, end, timeZone = 'Europe/Oslo', eventTypeId, username, eventTypeSlug } = req.query;

  const qs = new URLSearchParams({ start, end, timeZone });
  if (eventTypeId) qs.set('eventTypeId', eventTypeId);
  if (username && eventTypeSlug) { qs.set('username', username); qs.set('eventTypeSlug', eventTypeSlug); }

  const r = await fetch(`https://api.cal.com/v2/slots?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${process.env.CALCOM_API_KEY}` }
  });

  const data = await r.json();
  res.status(r.status).json(data);
}
