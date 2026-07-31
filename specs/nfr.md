# nfr.md — Non-Functional Requirements

> Tech stack godkjent 2026-05-21. Portet til Hetzner/Coolify 2026-07-31 (CR-008). Se sessions/DECISIONS.md for begrunnelse.

## Tech Stack

| Lag | Valg | Versjon |
|---|---|---|
| Rammeverk | Next.js (App Router) | 16.x |
| Språk | TypeScript | 5.x |
| Styling | Tailwind CSS | Tailwind 4.x |
| ORM | Prisma (driver adapter, `@prisma/adapter-pg`) | 7.x |
| Database | PostgreSQL selvhostet på Hetzner via Coolify | PostgreSQL 18 |
| Auth | Custom OTP + iron-session | — |
| E-post | Brevo SMTP | — |
| Deploy | Coolify (Hetzner CX23), Dockerfile build pack | — |
| Runtime | Node.js | 22.x (Alpine i Docker) |

## Migreringsplan
- **Database**: selvhostet Postgres via driver adapter — bytte leverandør krever kun ny `DATABASE_URL` + `prisma migrate deploy`, ingen kodeendring.
- **Deploy**: Dockerfile er portabel — kjører på enhver Docker-kompatibel host (Coolify, Railway, Render, ren VPS).
- **E-post**: Brevo → Postmark / AWS SES. E-postkall er isolert i `lib/email.ts` — bytt adapter der.
- **Auth**: Custom OTP er uten ekstern avhengighet. Ingen migrasjon nødvendig.

## Performance
- API p95 latency: < 500ms (intern tool, lav trafikk)
- Page load (LCP): < 2s på desktop
- Concurrent users: < 50 (internt team)

## Security
- Autentisering: OTP via e-post, kun `@bas.no`-domene
- Sessions: kryptert cookie via iron-session (HttpOnly, Secure, SameSite=Strict)
- OTP gyldig i maks 5 minutter
- Autorisering: enkel rolle-sjekk (user / admin). Ingen tung RBAC.
- Public godkjenningsendepunkt: returnerer kun tillatte felter (se FR-PUB-002)
- Godkjenningstoken: kryptografisk tilfeldig (crypto.randomBytes)
- TLS: påkrevd i produksjon (håndteres av Coolify/Traefik bak Hetzner-brannmur, kun 22/80/443 åpne)
- Rate limiting: sett på `/api/auth/request-code` (maks 5 forsøk/minutt per e-post)

## Availability
- Uptime: overvåkes via Uptime Kuma (`status.basbeta.no`)
- Backup: daglig Hetzner-snapshot (hele server) + daglig `pg_dump` → Hetzner Object Storage, 7 dagers historikk
- RTO/RPO: ikke formelt definert, men daglig backup gir maks 24t datatap ved katastrofe

## Observability (fase 1)
- Logging: `console.error` for server-feil, Coolify container-logs
- Feilsporing: Bugsink (`errors.basbeta.no`)
- Ressursovervåking: Netdata (server-nivå)
- Alerting: ikke i fase 1

## CI/CD
- Coolify GitHub App auto-deployer fra valgt branch ved push
- `prisma migrate deploy` kjører automatisk ved container-oppstart (idempotent)
- Ingen separat CI-pipeline i fase 1

## Constraints
- Hetzner CX23: delt ressurs med andre basbeta-prosjekter på samme server
- Brevo free tier: se leverandørens gjeldende grenser for sending/mnd
