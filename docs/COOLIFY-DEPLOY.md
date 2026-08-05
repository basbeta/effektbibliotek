# Deploy til Coolify (basbeta.no) — runbook

Manuelle steg i Coolify-UI/Hetzner. Kan ikke utføres fra en Claude Code-økt uten tilgang til Coolify-instansen — følges av produkteier eller den som har admin-tilgang på `coolify.basbeta.no`.

Ref: CR-008.

## 1. Database

1. Coolify → **New Resource** → **Database** → **PostgreSQL 18**
2. Navngi ressursen `effektbibliotek-db`
3. Noter `DATABASE_URL` (intern connection string Coolify genererer)
4. Under ressursens **Backups**: aktiver daglig `pg_dump` → samme S3-destinasjon (`basbeta-backup`-bucketen, credentials `coolify-backup`) som resten av basbeta-prosjektene, 7 dagers historikk
5. Verifiser med "Backup Now" at en fil dukker opp i bucketen

## 2. Applikasjon

1. Coolify → **New Resource** → **Application** → koble til GitHub-repo `basbeta/effektbibliotek`
2. Branch: den branchen som skal driftes i produksjon (avklar med produkteier — `master` eller egen prod-branch)
3. **Build Pack:** `Dockerfile` (ikke Nixpacks — kjent fallgruve i denne orgen)
4. **Ports Exposes:** `3000`
5. **Domain:** `effektbibliotek.basbeta.no` (wildcard-DNS på `*.basbeta.no` dekker dette automatisk)
6. Sett FQDN i Coolify **før** ev. webhook/GitHub App-oppdatering, slik at webhooken peker på `https://coolify.basbeta.no` og ikke rå IP:port (blokkeres av brannmuren)

## 3. Environment-variabler (på applikasjonen)

Sett disse i Coolify sitt env-panel — se `.env.example` i repoet for full liste:

| Variabel | Verdi |
|---|---|
| `DATABASE_URL` | connection string fra database-ressursen (steg 1) |
| `IRON_SESSION_SECRET` | ny tilfeldig streng, minst 32 tegn |
| `BREVO_SMTP_LOGIN` | Brevo-kontoens innloggings-e-post |
| `BREVO_SMTP_KEY` | SMTP-nøkkel generert i Brevo-dashbordet (ikke kontopassordet) |
| `FROM_EMAIL` | `Effektbibliotek <effektbibliotek@basbeta.no>` |
| `SENTRY_DSN` | DSN fra Bugsink (`errors.basbeta.no`, prosjekt "effektbibliotek") — bruk den offentlige hosten, ikke `localhost` |
| `NEXT_PUBLIC_SENTRY_DSN` | Samme DSN som `SENTRY_DSN` (kreves separat siden denne må være tilgjengelig i nettleseren) |
| `APP_URL` | `https://effektbibliotek.basbeta.no` — brukes til å bygge lenker i utgående e-post (godkjenningslenke, case-lenke). **IKKE** `NEXT_PUBLIC_APP_URL` — den prefiksen får Next.js til å bygge verdien statisk inn i koden ved build time, så en senere runtime-endring har ingen effekt (oppdaget i CR-013 etter at et første forsøk med `NEXT_PUBLIC_APP_URL` ikke slo gjennom). `request.url.origin` er dessuten upålitelig bak Traefik i API-routes og resolver til `localhost:3000` uten denne satt |
| `S3_ENDPOINT` | `https://fsn1.your-objectstorage.com` (Hetzner Object Storage, S3-kompatibel — CR-027, filopplasting til case-materiale) |
| `S3_REGION` | `fsn1` |
| `S3_BUCKET` | `basbeta-backup` — delt bucket med resten av basbeta-prosjektene. Appen skriver kun under prefiksen `effektbibliotek/case-materiale/`, kolliderer ikke med backup-jobben (som har sin egen 7-dagers retention scopet til backup-prefikset, ikke bucket-bredt) |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Access/secret-nøkkelpar med lese/skrivetilgang til bucketen over — kan være samme delte nøkkelpar som resten av basbeta-prosjektene bruker, eller et eget, avhengig av hva som er satt opp i Hetzner |

Merk: `effektbibliotek@basbeta.no` må finnes som avsenderadresse/alias godkjent i Brevo (domenet `basbeta.no` er allerede SPF/DKIM/DMARC-verifisert der).

## 4. Deploy

1. Trigg første deploy manuelt i Coolify
2. `prisma migrate deploy` kjører automatisk ved container-oppstart (del av `CMD` i `Dockerfile`) — sjekk deploy-loggen for at migreringen fullfører uten feil
3. Verifiser `https://effektbibliotek.basbeta.no` svarer med gyldig TLS-sertifikat

### 4b. Engangssteg — baseline av eksisterende produksjonsdatabase (CR-024, kun én gang)

Databasen på `effektbibliotek.basbeta.no` ble opprinnelig provisjonert med `prisma db push` (CR-011), ikke med formelle migreringer. Alle tabeller finnes allerede der. Å bytte Dockerfile CMD direkte til `prisma migrate deploy` er trygt KUN hvis baseline-migreringen allerede er markert som "applied" i produksjonsdatabasen — ellers vil `migrate deploy` prøve å opprette tabeller som allerede eksisterer og containeren crash-looper (samme feilmønster som CR-011).

**Appen har autodeploy på push til `master`** — det finnes ingen tidsluke til å kjøre et kommando "rett før" en deploy, siden push OG deploy skjer i samme øyeblikk. Derfor gjøres dette i to separate, uavhengige deploys:

**Deploy A (denne committen) — trygg, ingen atferdsendring:**
`prisma/migrations/`-mappen er lagt til i repoet, men Dockerfile sin `CMD` er **uendret** (`prisma db push --accept-data-loss && npm run start`). Denne committen kan pushes og autodeployes helt normalt — migreringsfilene ligger i det nye image-et, men blir ikke brukt til noe ennå.

**Manuelt steg, etter at Deploy A er live:**
1. Coolify → effektbibliotek-applikasjonen → fanen **Terminal** (gir et shell inn i den kjørende containeren — som nå er det nye image-et fra Deploy A, og dermed har `prisma/migrations/` tilgjengelig)
2. Kjør: `npx prisma migrate resolve --applied 20260804120000_init`
3. Bekreft at kommandoen rapporterer migreringen som "applied" — den skal kun markere historikken (oppretter `_prisma_migrations`-tabellen og setter inn én rad), ikke kjøre noen SQL mot det eksisterende skjemaet
4. (Valgfritt, men anbefalt) Verifiser i databasen: `SELECT * FROM "_prisma_migrations";` skal vise `20260804120000_init` med `finished_at` satt

**Deploy B (egen, senere commit) — aktiverer `migrate deploy`:**
Når steg 1–4 over er bekreftet utført, gjør vi en oppfølgings-commit som endrer Dockerfile CMD til `npx prisma migrate deploy && npm run start` og pusher den. Autodeploy trigges som normalt — `migrate deploy` finner at `20260804120000_init` allerede er anvendt, rapporterer "No pending migrations to apply", og appen starter normalt.

Alle migreringer lagt til etter Deploy B anvendes automatisk av `migrate deploy` ved fremtidige deploys, uten manuelt inngrep.

## 5. Verifisering ende-til-ende

- [ ] Logg inn med `@bas.no`-e-post, motta OTP via Brevo
- [ ] Opprett en case
- [ ] Kjør gjennom bruksgodkjenningsflyten, verifiser bekreftelses-e-post
- [ ] Kopiér godkjenningslenke fra en case og bekreft at den peker på `effektbibliotek.basbeta.no` (bruker `request.url.origin`, ingen manuell konfig nødvendig)

## 6. Overvåking

- Legg `effektbibliotek.basbeta.no` til som monitor i Uptime Kuma (`status.basbeta.no`)

## 7. Vercel/Neon (gammel produksjon) — klarert for fjerning 2026-08-05

Coolify-oppsettet er verifisert stabilt over flere uker og et bredt sett med CR-er. Produkteier ga 2026-08-05 klarsignal til full fjerning (ingen data av verdi der, jf. CR-008). Utføres manuelt av produkteier i respektive dashboards (utenfor det en Claude Code-økt har tilgang til):
- [ ] Fjern Vercel-prosjektet
- [ ] Slett Neon-databasen
