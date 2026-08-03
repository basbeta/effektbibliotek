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

Merk: `effektbibliotek@basbeta.no` må finnes som avsenderadresse/alias godkjent i Brevo (domenet `basbeta.no` er allerede SPF/DKIM/DMARC-verifisert der).

## 4. Deploy

1. Trigg første deploy manuelt i Coolify
2. `prisma migrate deploy` kjører automatisk ved container-oppstart (del av `CMD` i `Dockerfile`) — sjekk deploy-loggen for at migreringen fullfører uten feil
3. Verifiser `https://effektbibliotek.basbeta.no` svarer med gyldig TLS-sertifikat

## 5. Verifisering ende-til-ende

- [ ] Logg inn med `@bas.no`-e-post, motta OTP via Brevo
- [ ] Opprett en case
- [ ] Kjør gjennom bruksgodkjenningsflyten, verifiser bekreftelses-e-post
- [ ] Kopiér godkjenningslenke fra en case og bekreft at den peker på `effektbibliotek.basbeta.no` (bruker `request.url.origin`, ingen manuell konfig nødvendig)

## 6. Overvåking

- Legg `effektbibliotek.basbeta.no` til som monitor i Uptime Kuma (`status.basbeta.no`)

## 7. Vercel/Neon (gammel produksjon)

Ikke tøm eller slett før Coolify-oppsettet er verifisert i minst noen dager. Når `effektbibliotek.basbeta.no` er bekreftet stabilt:
- Fjern Vercel-prosjektet
- Slett Neon-databasen (ingen data å ta vare på, jf. CR-008)
