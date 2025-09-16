/*****  CAL.COM ADAPTER – fler-stegs (type → tjeneste → område → klinikk → dato/tid → detaljer → bekreft)  *****/

// --- Oppslag (kan være statisk JSON i /data hvis du vil) ---
const DOCTOR_TYPES = [
  { id: 'gp', name: 'Allmennlege' },
  // legg til flere: { id: 'derm', name: 'Hudlege' }, { id:'psych', name:'Psykolog' }, ...
];

const SERVICES_BY_TYPE = {
  gp: [ { id:'consult', name:'Konsultasjon' } ],
  // derm: [ { id:'rash', name:'Hudutredning' } ], ...
};

const AREAS = [
  { id:'oslo', name:'Oslo' },
  { id:'drammen', name:'Drammen' },
  { id:'video', name:'Digital' }
];

const CLINICS_BY_AREA = {
  oslo:   [ { id:'oslo-cent', name:'Oslo Sentrum' } ],
  drammen: [ { id:'drammen-1', name:'Drammen' } ],
  video:  [ { id:'video', name:'Digital / video' } ]
};

// --- MAP mot Cal.com event type ---
// Du har laget "Fysisk legetime". Slug/URL må stemme.
// URL du får ser slik ut: https://cal.com/medcom-kundeservice-nngprf/fysisk-legetime
const EVENT_TYPE_MAP = {
  // nøkkel = doctorType|service|clinic
  'gp|consult|oslo-cent': {
    username: 'medcom-kundeservice-nngprf',
    eventTypeSlug: 'fysisk-legetime'        // <-- sørg for at denne sluggen matcher i Cal.com
  },
  // Du kan reuse samme eventtype for andre klinikker, eller lage egne:
  'gp|consult|drammen-1': {
    username: 'medcom-kundeservice-nngprf',
    eventTypeSlug: 'fysisk-legetime'
  },
  // Digital legetime? legg til egen når du lager den i Cal.com:
  // 'gp|consult|video': { username:'medcom-kundeservice-nngprf', eventTypeSlug:'booke-legetime' }
};

const TZ = 'Europe/Oslo';

const Adapter = {
  // STEG 1 – Legetype
  async listDoctorTypes(){ return DOCTOR_TYPES; },

  // STEG 2 – Tjeneste
  async listServices(doctorTypeId){ return SERVICES_BY_TYPE[doctorTypeId] || []; },

  // STEG 3 – Område
  async listAreas(){ return AREAS; },

  // STEG 4 – Klinikk
  async listClinics(areaId){ return CLINICS_BY_AREA[areaId] || []; },

  // Finn riktig eventtype for Cal.com basert på valgene
  resolveEventType({ doctorTypeId, serviceId, clinicId }){
    const key = `${doctorTypeId}|${serviceId}|${clinicId}`;
    const cfg = EVENT_TYPE_MAP[key];
    if (!cfg) throw new Error('Mangler Cal.com mapping for: ' + key);
    return cfg;
  },

  // STEG 5 – Ledige tider (dag)
  async getAvailability({ doctorTypeId, serviceId, clinicId, date }){
    const map = this.resolveEventType({ doctorTypeId, serviceId, clinicId });

    const qs = new URLSearchParams({
      start: date, end: date, timeZone: TZ,
      ...(map.eventTypeId ? { eventTypeId: map.eventTypeId } : {}),
      ...(map.username && map.eventTypeSlug ? { username: map.username, eventTypeSlug: map.eventTypeSlug } : {})
    });

    const r = await fetch(`/api/slots?${qs.toString()}`);
    if (!r.ok) throw new Error('Kunne ikke hente tider');
    const data = await r.json();

    const slots = (data?.slots || []).map((s, i) => ({
      slot_id: `${doctorTypeId}|${serviceId}|${clinicId}|${s.start}`,
      starts_at: s.start,
      ends_at: s.end || null,
      etag: String(i)
    }));
    return { timeZone: TZ, slots };
  },

  // STEG 5 → 6 – Reserver valgt tid (hold i ~5 min)
  async reserve({ slot_id }){
    const [doctorTypeId, serviceId, clinicId, start] = slot_id.split('|');
    const map = this.resolveEventType({ doctorTypeId, serviceId, clinicId });

    const body = {
      start, timeZone: TZ,
      ...(map.eventTypeId ? { eventTypeId: map.eventTypeId } : {}),
      ...(map.username && map.eventTypeSlug ? { username: map.username, eventTypeSlug: map.eventTypeSlug } : {})
    };

    const r = await fetch('/api/reserve', {
      method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body)
    });
    if (r.status === 409) { const e=new Error('conflict'); e.status=409; throw e; }
    if (!r.ok) throw new Error('Kunne ikke holde av tiden');
    const data = await r.json();

    // Cal.com svarer bl.a.: { id, start, end, expiresAt, ... }
    return { reservation_id: data.id, expires_at: data.expiresAt };
  },

  // STEG 7 – Bekreft bookingen
  async confirm({ reservation_id, patient, consent }){
    const body = {
      reservationId: reservation_id,
      timeZone: TZ,
      attendees: [{ name: patient.name, email: patient.email, phone: patient.phone }]
    };

    const r = await fetch('/api/book', {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Idempotency-Key': (Math.random().toString(36).slice(2) + Date.now().toString(36))
      },
      body: JSON.stringify(body)
    });

    if (r.status === 410) { const e=new Error('expired'); e.status=410; throw e; }
    if (!r.ok) throw new Error('Kunne ikke bekrefte booking');
    const data = await r.json();

    return { booking_id: data.id, manage_url: data.bookingUrl || '../index.html' };
  }
};

// --- (Valgfritt) vis nedtelling når en reservasjon er aktiv ---
let countdownTimer = null;
function startHoldCountdown(expiresISO, updateCb, doneCb) {
  stopHoldCountdown();
  const end = new Date(expiresISO).getTime();
  const tick = () => {
    const left = Math.max(0, end - Date.now());
    const m = Math.floor(left/60000), s = Math.floor((left%60000)/1000);
    updateCb(`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    if (left <= 0) { stopHoldCountdown(); doneCb && doneCb(); }
  };
  countdownTimer = setInterval(tick, 1000);
  tick();
}
function stopHoldCountdown(){ if (countdownTimer) clearInterval(countdownTimer); countdownTimer = null; }
