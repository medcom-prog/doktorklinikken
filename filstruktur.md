doktorkliniken-no/
├─ index.html                       # Forside
├─ tjenester/
│  ├─ index.html                    # Oversikt: alle tjenester
│  ├─ legetime.html
│  ├─ psykolog.html
│  ├─ naprapat.html
│  ├─ blodprover.html
│  ├─ attester.html
│  └─ bedriftshelse.html
├─ bestill/
│  └─ index.html                    # Booking/CTA-side (lenker til system)
├─ priser/
│  └─ index.html
├─ kontakt/
│  └─ index.html
├─ om-oss/
│  └─ index.html
├─ juridisk/
│  ├─ personvern.html
│  └─ vilkar.html
├─ assets/
│  ├─ css/
│  │  ├─ style.css                  # Hovedstil (tilpasset fra bilmal)
│  │  └─ utilities.css              # Små hjelpere / tokens
│  ├─ js/
│  │  ├─ script.js                  # Felles interaksjoner (meny, FAQ, etc.)
│  │  └─ booking.js                 # Evt. booking-intensjon/parametre
│  ├─ img/
│  │  ├─ hero/
│  │  ├─ services/                  # Ikoner/bilder pr. tjeneste
│  │  ├─ team/
│  │  └─ ui/                        # UI‑grafikk (bakgrunner, mønster)
│  ├─ icons/
│  │  ├─ favicon.ico
│  │  ├─ site.webmanifest
│  │  └─ apple-touch-icon.png
│  ├─ fonts/
│  └─ schema/
│     └─ home.json                  # Evt. JSON-LD utskilt fra HTML
├─ data/
│  ├─ priser.json                   # Kilder for pristabell
│  └─ faq.json                      # Ofte stilte spørsmål
├─ 404.html
├─ sitemap.xml
├─ robots.txt
└─ service-worker.js                # Valgfritt (PWA/asset-caching)
