/* =========================================================
   Doktor Kliniken – felles script.js (oppgradert)
   (nav, a11y, header på scroll, scroll-top, countup,
    skjema-validering, ScrollReveal, hash-offset, Calendly m.m.)
   ========================================================= */

/* ---------- Utils ---------- */
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const $  = (sel, root = document) => root.querySelector(sel);

const debounce = (fn, ms = 300) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

/* ---------- Mobilmeny / Off-canvas (med fokusfelle) ---------- */
(() => {
  const navMenu   = $("#nav-menu");
  const navToggle = $("#nav-toggle");
  const navClose  = $("#nav-close");
  const body = document.body;

  if (!navMenu) return;

  let lastFocusedBeforeMenu = null;

  const getFocusable = () =>
    $$('a[href], button:not([disabled]), textarea, input[type="text"], input[type="email"], input[type="tel"], select, [tabindex]:not([tabindex="-1"])', navMenu)
    .filter(el => el.offsetParent !== null);

  const firstFocusable = () => getFocusable()[0];
  const lastFocusable  = () => getFocusable().slice(-1)[0];

  function openMenu() {
    lastFocusedBeforeMenu = document.activeElement;
    navMenu.classList.add("show-menu");
    body.classList.add("nav-open");
    body.style.overflow = "hidden";
    navToggle?.setAttribute("aria-expanded", "true");
    navMenu.setAttribute("aria-hidden", "false");
    firstFocusable()?.focus();
  }

  function closeMenu() {
    navMenu.classList.remove("show-menu");
    body.classList.remove("nav-open");
    body.style.overflow = "";
    navToggle?.setAttribute("aria-expanded", "false");
    navMenu.setAttribute("aria-hidden", "true");
    lastFocusedBeforeMenu?.focus?.();
  }

  navToggle?.addEventListener("click", openMenu);
  navClose?.addEventListener("click", closeMenu);

  // Lukk ved klikk på bakgrunn
  navMenu.addEventListener("click", (e) => {
    const isBackdrop = e.target === navMenu;
    if (isBackdrop) closeMenu();
  });

  // ESC lukker meny
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && navMenu.classList.contains("show-menu")) closeMenu();
  });

  // Fokusfelle
  navMenu.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || !navMenu.classList.contains("show-menu")) return;
    const first = firstFocusable();
    const last  = lastFocusable();
    if (!first || !last) return;

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  // Klikk på nav-lenke lukker meny (mobil)
  $$(".nav__menu .nav__link").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });
})();

/* ---------- Header bakgrunn/skygge ved scroll ---------- */
(() => {
  const header = $("#header");
  if (!header) return;

  const onScroll = () => {
    if (window.scrollY >= 50) header.classList.add("scroll-header");
    else header.classList.remove("scroll-header");
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();

/* ---------- Aktiv lenke i hovedmeny (robust) ---------- */
(() => {
  const links = $$(".nav__list .nav__link");
  if (!links.length) return;

  // Normaliser stier, håndter /index.html som /
  const norm = (href) => {
    const u = new URL(href, location.href);
    let p = u.pathname.toLowerCase();
    p = p.replace(/\/index\.html$/i, "/").replace(/\/+$/,"/"); // /kontakt/index.html -> /kontakt/
    return p || "/";
  };

  const current = norm(location.href);

  // Fjern ev. hardkodet aktiv
  links.forEach((l) => { l.classList.remove("active-link"); l.removeAttribute("aria-current"); });

  // Finn toppnivå-segment ("/tjenester/", "/priser/", osv.)
  const topSegment = current === "/" ? "/" : `/${current.split('/').filter(Boolean)[0]}/`;

  // Prioritet: 1) eksakt side 2) seksjon 3) hjem
  let active =
      [...links].find(a => norm(a.href) === current) ||
      [...links].find(a => norm(a.href) === topSegment) ||
      [...links].find(a => norm(a.href) === "/");

  if (active) {
    active.classList.add("active-link");
    active.setAttribute("aria-current", "page");
  }
})();

/* ---------- Scroll-top knapp ---------- */
(() => {
  const btn = $("#scroll-top");
  if (!btn) return;

  const show = () => {
    if (window.scrollY >= 350) btn.classList.add("show");
    else btn.classList.remove("show");
  };

  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  window.addEventListener("scroll", show, { passive: true });
  show();
})();

/* ---------- CountUp for hero-statistikk ---------- */
(() => {
  const items = $$("[data-countup]");
  if (!items.length) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const format = (value) => Number(value).toLocaleString("nb-NO", { maximumFractionDigits: 0 });
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  function animate(el) {
    const end      = parseFloat(el.getAttribute("data-count-to")) || 0;
    const start    = parseFloat(el.getAttribute("data-start")) || 0;
    const duration = parseInt(el.getAttribute("data-duration"), 10) || 1800;
    const prefix   = el.getAttribute("data-prefix") || "";
    const suffix   = el.getAttribute("data-suffix") || "";

    if (reduceMotion) {
      el.textContent = `${prefix}${format(end)}${suffix}`;
      el.setAttribute("data-counted", "true");
      return;
    }

    let startTime = null;
    const step = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = easeOutCubic(progress);
      const current = start + (end - start) * eased;
      el.textContent = `${prefix}${format(current)}${suffix}`;

      if (progress < 1) requestAnimationFrame(step);
      else {
        el.textContent = `${prefix}${format(end)}${suffix}`;
        el.setAttribute("data-counted", "true");
      }
    };
    requestAnimationFrame(step);
  }

  // Start når containeren blir synlig
  const container = $(".hero__stats") || document.body;
  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        $$("[data-countup]", entry.target).forEach((el) => {
          if (el.getAttribute("data-counted") !== "true") animate(el);
        });
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.3 }
  );
  io.observe(container);
})();

/* ---------- Skjema-validering (kontakt) ---------- */
(() => {
  const form = $("#contact-form");
  if (!form) return;

  function showAlert(msg) {
    alert(msg);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const nameEl    = $("#name", form);
    const emailEl   = $("#email", form);
    const phoneEl   = $("#phone", form);
    const topicEl   = $("#topic", form);
    const messageEl = $("#message", form);

    const name    = nameEl?.value.trim() || "";
    const email   = emailEl?.value.trim() || "";
    const phone   = phoneEl?.value.trim() || "";
    const message = messageEl?.value.trim() || "";

    if (!name || !email || !message) {
      showAlert("Vennligst fyll ut alle obligatoriske felt (Navn, E-post, Melding).");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailPattern.test(email)) {
      showAlert("Vennligst oppgi en gyldig e-postadresse.");
      emailEl?.focus();
      return;
    }

    if (phone && !/^[0-9 +()\-]{5,}$/.test(phone)) {
      showAlert("Vennligst oppgi et gyldig telefonnummer.");
      phoneEl?.focus();
      return;
    }

    // (Her kan du sende til et backend-endepunkt/Forms handler)
    showAlert("Takk! Meldingen er sendt. Vi svarer så snart vi kan.");
    form.reset();
    if (topicEl) topicEl.value = "";
  });
})();

/* ---------- ScrollReveal (valgfritt) ---------- */
(() => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.addEventListener("DOMContentLoaded", () => {
    if (typeof ScrollReveal === "undefined" || prefersReducedMotion) return;

    const sr = ScrollReveal({
      origin: "bottom",
      distance: "24px",
      duration: 800,
      delay: 120,
      easing: "cubic-bezier(.2,.6,.2,1)",
      mobile: true,
      cleanup: true,
      reset: false,
      viewFactor: 0.12,
    });

    sr.reveal(
      [
        ".section__header",
        ".hero__content",
        ".hero__image",
        ".service__card",
        ".testimonial__card",
        ".contact__card",
        ".contact__form",
        ".cta__container",
        ".footer__section",
      ].join(", "),
      { interval: 90 }
    );
  });
})();

/* ---------- Hash-offset (for fast header) ---------- */
(() => {
  const HEADER_OFFSET = 72; // px – matcher CSS header-høyde

  function scrollToHash(hash, instant = false) {
    if (!hash) return;
    const el = document.getElementById(hash.replace(/^#/, ""));
    if (!el) return;

    const top = el.getBoundingClientRect().top + window.pageYOffset - HEADER_OFFSET;
    window.scrollTo({ top, behavior: instant ? "auto" : "smooth" });
  }

  if (location.hash) {
    setTimeout(() => scrollToHash(location.hash, true), 0);
  }

  window.addEventListener("hashchange", () => scrollToHash(location.hash));
})();

/* ---------- Calendly: popup + inline (lazy-load) ---------- */
(function calendlyInit(){
  let calendlyLoaded = false;
  let calendlyCssLoaded = false;

  function loadCalendlyAssets(cb){
    const run = () => (typeof Calendly !== "undefined") ? cb() : setTimeout(run, 60);

    if (!calendlyCssLoaded) {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = "https://assets.calendly.com/assets/external/widget.css";
      document.head.appendChild(l);
      calendlyCssLoaded = true;
    }

    if (typeof Calendly !== "undefined") return cb();
    if (!calendlyLoaded){
      const s = document.createElement("script");
      s.src = "https://assets.calendly.com/assets/external/widget.js";
      s.async = true;
      s.onload = run;
      document.head.appendChild(s);
      calendlyLoaded = true;
    } else {
      run();
    }
  }

  // Popup (delegert klikk)
  document.addEventListener("click", function (e) {
    const t = e.target.closest('[data-calendly="popup"]');
    if (!t) return;

    e.preventDefault();
    const url = t.getAttribute("data-calendly-url");
    if (!url) return window.open("https://calendly.com/", "_blank", "noopener");

    loadCalendlyAssets(() => {
      try { Calendly.initPopupWidget({ url }); }
      catch { window.open(url, "_blank", "noopener"); }
    });
  }, { passive: false });

  // Inline (auto-init på containere)
  document.addEventListener("DOMContentLoaded", () => {
    const inlineBlocks = $$('[data-calendly="inline"][data-calendly-url]');
    if (!inlineBlocks.length) return;

    loadCalendlyAssets(() => {
      inlineBlocks.forEach((el) => {
        const url = el.getAttribute("data-calendly-url");
        const prefillName  = el.getAttribute("data-prefill-name")  || "";
        const prefillEmail = el.getAttribute("data-prefill-email") || "";
        const utmSource    = el.getAttribute("data-utm-source")    || "";
        const utmMedium    = el.getAttribute("data-utm-medium")    || "";
        const utmCampaign  = el.getAttribute("data-utm-campaign")  || "";

        // Høyde fallback
        if (!el.style.minHeight) el.style.minHeight = "720px";
        if (!el.style.width) el.style.width = "100%";

        try {
          Calendly.initInlineWidget({
            url,
            parentElement: el,
            prefill: {
              name:  prefillName  || undefined,
              email: prefillEmail || undefined,
            },
            utm: {
              utmSource:   utmSource   || undefined,
              utmMedium:   utmMedium   || undefined,
              utmCampaign: utmCampaign || undefined,
            }
          });
        } catch (err) {
          // Fallback: åpen i ny fane
          const a = document.createElement("a");
          a.href = url;
          a.target = "_blank";
          a.rel = "noopener";
          a.textContent = "Åpne booking i ny fane";
          a.className = "btn btn--secondary";
          el.innerHTML = "";
          el.appendChild(a);
        }
      });
    });
  });
})();
/* ---------- Konsistent breadcrumbs (auto) ---------- */
(() => {
  const mount = document.getElementById("breadcrumbs");
  if (!mount) return;

  // Skjul på forside (/, /index.html eller tilsvarende)
  const path = location.pathname.replace(/\/+$/, m => m ? "/" : "");
  const parts = path.split("/").filter(Boolean);
  const isHome = parts.length === 0 || (parts.length === 1 && parts[0].toLowerCase() === "index.html");
  if (isHome) { mount.hidden = true; return; }

  // Finn "Hjem"-lenke ved å lese logoens href (robust for subkatalog)
  let homeHref = "/";
  const logo = document.querySelector(".nav .nav__logo");
  try { if (logo) homeHref = new URL(logo.getAttribute("href") || "/", location.href).pathname; } catch {}

  // Kart for pene titler
  const titleMap = {
    "tjenester": "Tjenester",
    "bestill": "Bestill time",
    "priser": "Priser",
    "om-oss": "Om oss",
    "kontakt": "Kontakt",
    "juridisk": "Juridisk",

    "legetime.html": "Legetime",
    "psykolog.html": "Psykolog",
    "naprapat-fysio.html": "Fysioterapi & Naprapat",
    "vaksinering.html": "Vaksinering",
    "blodprover.html": "Blodprøver",
    "bedriftshelse.html": "Bedriftshelse",
    "personvern.html": "Personvern",
    "vilkar.html": "Vilkår",
    "index.html": "Index"
  };

  const humanize = (s) =>
    s.replace(/\.html$/,"")
     .replace(/-/g," ")
     .replace(/\b\p{L}/gu, c => c.toUpperCase());

  // Bygg liste over crumbs
  const crumbs = [{ href: homeHref, label: "Hjem" }];

  // Akkumuler absolutt sti (fungerer også ved subdir, f.eks. /doktorkliniken-no/…)
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i];
    const isLast = i === parts.length - 1;
    const isFile = /\.[a-z0-9]+$/i.test(seg);

    // Hopp over siste "index.html" og bruk katalogens navn som siste crumb
    if (isLast && seg.toLowerCase() === "index.html") {
      const dir = parts[i - 1];
      if (dir) {
        const label = titleMap[dir] || humanize(dir);
        crumbs.push({ href: null, label });
      }
      continue;
    }

    const abs = "/" + parts.slice(0, i + 1).join("/");
    const label =
      titleMap[seg] ||
      titleMap[seg.replace(/\.html$/,"")] ||
      humanize(seg);

    // Siste crumb = current (uten lenke)
    if (isLast) {
      crumbs.push({ href: null, label });
    } else {
      // Mellomledd: lenk til index.html for kataloger
      let href = abs;
      if (!isFile) href = abs.replace(/\/?$/, "/") + "index.html";

      // Unngå å duplisere 'Hjem' hvis abs === homeHref
      if (abs.replace(/\/+$/,"") !== homeHref.replace(/\/+$/,""))
        crumbs.push({ href, label });
    }
  }

  // Render (schema.org BreadcrumbList)
  const container = mount.querySelector(".container") || mount;
  const ol = document.createElement("ol");
  ol.className = "breadcrumbs__list";
  ol.setAttribute("itemscope", "");
  ol.setAttribute("itemtype", "https://schema.org/BreadcrumbList");

  crumbs.forEach((c, idx) => {
    const li = document.createElement("li");
    li.className = "breadcrumbs__item";
    li.setAttribute("itemprop", "itemListElement");
    li.setAttribute("itemscope", "");
    li.setAttribute("itemtype", "https://schema.org/ListItem");

    if (c.href) {
      const a = document.createElement("a");
      a.href = c.href;
      a.setAttribute("itemprop", "item");
      const span = document.createElement("span");
      span.setAttribute("itemprop", "name");
      span.textContent = c.label;
      a.appendChild(span);
      li.appendChild(a);
    } else {
      const span = document.createElement("span");
      span.textContent = c.label;
      span.setAttribute("itemprop", "name");
      span.setAttribute("aria-current", "page");
      li.appendChild(span);
    }

    const pos = document.createElement("meta");
    pos.setAttribute("itemprop", "position");
    pos.content = String(idx + 1);
    li.appendChild(pos);

    ol.appendChild(li);
  });

  container.innerHTML = "";
  container.appendChild(ol);
  mount.hidden = false;
})();
/* ---------- ScrollReveal (valgfritt) ---------- */
(() => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.addEventListener("DOMContentLoaded", () => {
    if (typeof ScrollReveal === "undefined" || prefersReducedMotion) return;

    const sr = ScrollReveal({
      origin: "bottom",
      distance: "24px",
      duration: 800,
      delay: 120,
      easing: "cubic-bezier(.2,.6,.2,1)",
      mobile: true,
      cleanup: true,
      reset: false,
      viewFactor: 0.12,
    });

    const targets = [
      // Forside-hero
      ".hero__content",
      ".hero__image",
      // Page-hero (undersider, inkl. /tjenester/)
      ".page-hero__content",
      ".page-hero__image",
      // Vanlige seksjoner
      ".section__header",
      ".service__card",
      ".testimonial__card",
      ".contact__card",
      ".contact__form",
      ".cta__container",
      ".footer__section",
    ].join(", ");

    sr.reveal(targets, { interval: 90 });
  });
})();
/* ---------- Nyhetsbrev / påminnelse (vaksinebuss) ---------- */
(() => {
  const form = document.getElementById('newsletter-form');
  if (!form) return;

  const emailEl  = form.querySelector('#news-email');
  const postEl   = form.querySelector('#news-postnr');

  function show(msg) {
    // Vis en liten inline-beskjed (unngå alert)
    let note = form.querySelector('[data-note]');
    if (!note) {
      note = document.createElement('p');
      note.setAttribute('data-note', '1');
      note.className = 'card__text';
      form.appendChild(note);
    }
    note.textContent = msg;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = (emailEl?.value || '').trim();
    const post  = (postEl?.value || '').trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (!emailPattern.test(email)) { emailEl?.focus(); return show('Oppgi en gyldig e-post.'); }
    if (post && !/^[0-9]{4}$/.test(post)) { postEl?.focus(); return show('Postnummer må være 4 siffer (valgfritt).'); }

    // TODO: Koble til e-postleverandør (Mailchimp/Sendinblue/Make/Zapier)
    // Eksempel:
    // await fetch('/api/newsletter', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ email, postnr: post }) });

    show('Takk! Vi varsler deg når vaksinebussen er i nærheten.');
    form.reset();
  });
})();

/* ---------- Drop-in tabell: enkel renderer ---------- */
/* Bruk: sett window.DK_DROPIN = [
 *   { date: '2025-05-20', place: 'Oslo, Rådhusplassen', time: '12–18', vaccines: 'Influensa, TBE' },
 *   { date: '2025-05-22', place: 'Lillestrøm Torv',      time: '10–16', vaccines: 'TBE, Hep A' }
 * ];
 */
(() => {
  const section = document.getElementById('dropin');
  if (!section) return;
  const tbody = section.querySelector('.table tbody');
  if (!tbody) return;

  const rows = Array.isArray(window.DK_DROPIN) ? window.DK_DROPIN : [];
  if (!rows.length) return; // beholder placeholder-raden

  tbody.innerHTML = '';
  rows.forEach(({ date, place, time, vaccines }) => {
    const tr = document.createElement('tr');

    const tdDate = document.createElement('td');
    tdDate.textContent = date || '';
    tdDate.setAttribute('data-th', 'Dato');

    const tdPlace = document.createElement('td');
    tdPlace.textContent = place || '';
    tdPlace.setAttribute('data-th', 'Sted');

    const tdTime = document.createElement('td');
    tdTime.textContent = time || '';
    tdTime.setAttribute('data-th', 'Tid');

    const tdVac = document.createElement('td');
    tdVac.textContent = vaccines || '';
    tdVac.setAttribute('data-th', 'Vaksiner');

    tr.append(tdDate, tdPlace, tdTime, tdVac);
    tbody.appendChild(tr);
  });
})();
