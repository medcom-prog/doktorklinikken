// POST /api/book
// body: { reservationId, attendees:[{name,email,phone}], timeZone, ... }
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const headers = {
    Authorization: `Bearer ${process.env.CALCOM_API_KEY}`,
    'Content-Type': 'application/json'
  };
  if (req.headers['idempotency-key']) headers['Idempotency-Key'] = req.headers['idempotency-key'];

  const r = await fetch('https://api.cal.com/v2/bookings', {
    method: 'POST',
    headers,
    body: JSON.stringify(req.body)
  });

  const data = await r.json();
  res.status(r.status).json(data);
}
