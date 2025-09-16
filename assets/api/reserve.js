// POST /api/reserve
// body: { eventTypeId? | username+eventTypeSlug?, start, timeZone, duration? }
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const r = await fetch('https://api.cal.com/v2/slots/reservations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.CALCOM_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(req.body)
  });

  const data = await r.json();
  res.status(r.status).json(data);
}
