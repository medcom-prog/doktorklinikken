import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8787;
const API_KEY = process.env.CALCOM_API_KEY;

// --- Sjekk nøkkel ved oppstart ---
if (!API_KEY) {
  console.error("[ERR] CALCOM_API_KEY mangler i .env");
  process.exit(1);
}

// --- Grunnleggende middlewares ---
app.use(cors());                // Tillat fra localhost dev
app.use(express.json({ limit: "1mb" }));

// Enkel request-logg i dev
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  }
  next();
});

// Helse-sjekk
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "doktor-kliniken-local-api", time: new Date().toISOString() });
});

// --- Slots: GET /api/slots?start=YYYY-MM-DD&end=YYYY-MM-DD&timeZone=Europe/Oslo&eventTypeId=... | username=...&eventTypeSlug=... ---
app.get("/api/slots", async (req, res) => {
  try {
    const { start, end, timeZone = "Europe/Oslo", eventTypeId, username, eventTypeSlug } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: "missing_params", details: "start og end (YYYY-MM-DD) er påkrevd" });
    }
    if (!eventTypeId && !(username && eventTypeSlug)) {
      return res.status(400).json({ error: "missing_event_type", details: "angi eventTypeId ELLER username + eventTypeSlug" });
    }

    const qs = new URLSearchParams({ start, end, timeZone });
    if (eventTypeId) qs.set("eventTypeId", String(eventTypeId));
    if (username && eventTypeSlug) {
      qs.set("username", String(username));
      qs.set("eventTypeSlug", String(eventTypeSlug));
    }

    const r = await fetch(`https://api.cal.com/v2/slots?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });

    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (err) {
    console.error("[slots] error:", err);
    return res.status(500).json({ error: "slots_failed" });
  }
});

// --- Reserve: POST /api/reserve { start, timeZone, eventTypeId? | username+eventTypeSlug? } ---
app.post("/api/reserve", async (req, res) => {
  try {
    const body = req.body || {};
    if (!body?.start) {
      return res.status(400).json({ error: "missing_start", details: "start (ISO) er påkrevd" });
    }
    if (!(body?.eventTypeId || (body?.username && body?.eventTypeSlug))) {
      return res.status(400).json({ error: "missing_event_type", details: "angi eventTypeId ELLER username + eventTypeSlug" });
    }
    if (!body?.timeZone) body.timeZone = "Europe/Oslo";

    const r = await fetch("https://api.cal.com/v2/slots/reservations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (err) {
    console.error("[reserve] error:", err);
    return res.status(500).json({ error: "reserve_failed" });
  }
});

// --- Book: POST /api/book { reservationId, attendees:[{name,email,phone}], timeZone, ... } ---
app.post("/api/book", async (req, res) => {
  try {
    const body = req.body || {};
    if (!body?.reservationId) {
      return res.status(400).json({ error: "missing_reservationId" });
    }
    if (!Array.isArray(body.attendees) || body.attendees.length === 0) {
      return res.status(400).json({ error: "missing_attendees", details: "attendees må være en liste med minst én deltager" });
    }
    if (!body?.timeZone) body.timeZone = "Europe/Oslo";

    const headers = {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key":
        req.get("Idempotency-Key") ||
        (Math.random().toString(36).slice(2) + Date.now().toString(36))
    };

    const r = await fetch("https://api.cal.com/v2/bookings", {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (err) {
    console.error("[book] error:", err);
    return res.status(500).json({ error: "book_failed" });
  }
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`Local API running at http://localhost:${PORT}`);
  console.log("Health check:        GET /api/health");
  console.log("Slots example:       GET /api/slots?start=2025-09-16&end=2025-09-16&timeZone=Europe/Oslo&username=medcom-kundeservice-nngprf&eventTypeSlug=fysisk-legetime");
});
