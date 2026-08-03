# DECISIONS.md

> Append-only. Document every significant architectural or governance decision.

## Format
```
DATE: YYYY-MM-DD
DECISION: [short title]
CONTEXT: [why was this needed]
DECISION: [what was decided]
ALTERNATIVES CONSIDERED: [what else was evaluated]
RATIONALE: [why this option]
CONSEQUENCES: [what this enables or constrains]
DECIDED BY: human | Claude | both
```

## Decisions

DATE: 2026-05-21
DECISION: Adopt governed AI-native repository structure
CONTEXT: AI-assisted development across multiple sessions requires explicit session continuity, change traceability, and governance to prevent architectural drift.
DECISION: Implement full governance structure with CLAUDE.md, session orchestration, CR system, review system, and agent roles.
ALTERNATIVES CONSIDERED: Ad-hoc prompting; rules-only approach.
RATIONALE: Ad-hoc prompting loses context between sessions. Explicit structure makes AI behavior deterministic and auditable.
CONSEQUENCES: All changes require a CR. Sessions start and end with orchestration file updates.
DECIDED BY: human

---

DATE: 2026-05-21
DECISION: Tech stack for Effektbibliotek v1
CONTEXT: Prosjektet skal utvikles i fase 1 med gratisverktøy, og stacken må være enkel å migrere når produktet går i drift.
DECISION: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Prisma + Neon (PostgreSQL) + Custom OTP + iron-session + Resend + Vercel Hobby.
ALTERNATIVES CONSIDERED: SvelteKit (mindre community, færre shadcn-ressurser). Supabase auth / Clerk (vendor lock-in og kostnad ved skalering). Auth0 (kostnad). Remix (god DX men mer friksjon mot Vercel).
RATIONALE: Next.js gir fullstack i én kodebase. Prisma gjør database-bytte til én linjeskift. Custom OTP har ingen ekstern avhengighet. Resend og Neon er isolert bak adapter-lag. Vercel Hobby er gratis og deployer Next.js uten konfigurasjon.
CONSEQUENCES: Serverless 10s timeout (uproblematisk). E-post og auth er fullt kontrollerbare. Migrering til annen hosting krever ingen kodeendringer i forretningslogikk.
DECIDED BY: human

---

DATE: 2026-05-21
DECISION: Nodemailer + Gmail SMTP i stedet for Resend
CONTEXT: Resend free tier kan kun sende til verifiserte e-postadresser uten domene-verifisering, noe som blokkerer e-post til kunder i beta.
DECISION: Bruk Nodemailer med Gmail SMTP og App Password for e-postutsending.
ALTERNATIVES CONSIDERED: Resend (fungerer ikke uten verifisert domene på free tier). Mailgun (kostnad).
RATIONALE: Gmail SMTP er gratis, fungerer umiddelbart, og lar oss sende til vilkårlige adresser. App Password er sikker nok for beta.
CONSEQUENCES: Daglig sendegrense ~500 e-post. Bør byttes til dedikert e-posttjeneste ved skalering. Endringen isolert til lib/email.ts.
DECIDED BY: both

---

DATE: 2026-05-22
DECISION: Godkjenningslenke bruker request.url.origin, ikke NEXT_PUBLIC_APP_URL
CONTEXT: Under utvikling kjørte dev-serveren på port 3001 fordi 3000 var opptatt, men NEXT_PUBLIC_APP_URL pekte på localhost:3000, noe som ga ERR_CONNECTION_REFUSED på godkjenningslenken.
DECISION: Alltid bruke `new URL(request.url).origin` for å bygge godkjenningslenker i API-routes.
ALTERNATIVES CONSIDERED: Sette NEXT_PUBLIC_APP_URL riktig per miljø.
RATIONALE: request.url.origin er alltid korrekt — riktig i prod (Vercel-URL), riktig i dev uavhengig av port. Eliminerer kilde til port-mismatch-feil.
CONSEQUENCES: Godkjenningslenken fungerer automatisk i alle miljøer uten manuell env-konfigurasjon.
DECIDED BY: Claude

---

DATE: 2026-05-22
DECISION: prisma generate som del av build-script på Vercel
CONTEXT: Prisma 7 med custom output-path (`app/generated/prisma`) genererer ikke klienten automatisk under `npm install` på Vercel.
DECISION: Build-script er `prisma generate && next build`.
ALTERNATIVES CONSIDERED: postinstall script; Vercel build command override.
RATIONALE: Enklest å vedlikeholde, synlig i package.json, ingen ekstern Vercel-konfigurasjon nødvendig.
CONSEQUENCES: Byggetid øker med ~2 sekunder. Prisma-klienten er alltid oppdatert med skjema ved deploy.
DECIDED BY: Claude

---

DATE: 2026-07-31
DECISION: Full port fra Vercel/Neon til Hetzner/Coolify/PostgreSQL 18 (CR-008)
CONTEXT: Effektbiblioteket lå på Vercel/Neon (isolert fra Bas' egen infrastruktur). Bas har bygget basbeta.no — en dedikert, GDPR-compliant beta-plattform på Hetzner med Coolify — der hvert prosjekt skal driftes isolert med eget subdomene og database.
DECISION: Full migrering (ikke parallelldrift). Deploy: Vercel → Coolify (Dockerfile build pack, domene `effektbibliotek.basbeta.no`). Database: Neon → fersk PostgreSQL 18-instans i Coolify, ingen datamigrering. E-post: Gmail SMTP → Brevo SMTP med per-prosjekt-avsender.
ALTERNATIVES CONSIDERED: Parallelldrift (Vercel + Coolify samtidig) — avvist, unødvendig kompleksitet for et prosjekt uten viktige produksjonsdata. Datamigrering fra Neon — avvist, produkteier bekreftet at ingenting i eksisterende data er viktig.
RATIONALE: basbeta-infrastrukturen er allerede bygget og betalt for nettopp denne typen prosjekter (lav kostnad, europeisk, GDPR ut av boksen). Prisma sin driver-adapter gjør databasebytte til kun en ny connection string. Dockerfile er portabelt og fjerner Vercel-spesifikke antakelser fra koden.
CONSEQUENCES: Nytt produksjons-domene (`effektbibliotek.basbeta.no`). `prisma migrate deploy` kjører automatisk ved container-oppstart i stedet for i Vercel sitt build-steg. Manuelt Coolify-oppsett (database, app-ressurs, domene, env-vars, backup, overvåking) må utføres av produkteier — dokumentert i `docs/COOLIFY-DEPLOY.md`. Vercel/Neon beholdes urørt som fallback inntil Coolify er verifisert stabilt.
DECIDED BY: human

---

DATE: 2026-08-03
DECISION: Legg til SMTP-timeout på Brevo-transportøren (CR-009)
CONTEXT: Etter at CR-008 ble satt i produksjon på Coolify (effektbibliotek.basbeta.no), hang OTP-innlogging uten å sende e-post eller returnere feil. Transportøren i lib/email.ts hadde ingen connection/greeting/socket-timeout, så en SMTP-tilkoblingsfeil (feil/manglende credentials, blokkert utgående port) ble aldri overflatebehandlet — requesten ventet på ubestemt tid.
DECISION: Sett 10s `connectionTimeout`, `greetingTimeout` og `socketTimeout` på nodemailer-transportøren.
ALTERNATIVES CONSIDERED: La feilen forbli synlig kun via serverlogger uten timeout (avvist — brukeren ser fortsatt en hengende spinner). Lengre/kortere timeout-verdi — 10s valgt som balanse mellom å tåle normal SMTP-latens og å feile raskt nok til å ikke oppleves som henging.
RATIONALE: En rask, synlig feil er alltid bedre enn en uendelig hengende request — spesielt nå som appen ikke lenger kjører bak en plattform (Vercel) som håndhevet et function-timeout for oss.
CONSEQUENCES: Løser symptomet (hengende UI). Løser ikke nødvendigvis rotårsaken til hvorfor SMTP faktisk feiler i Coolify — det er en driftsoppgave (verifisere env-vars og brannmurregler), ikke en kodefeil, og er dokumentert som neste steg i CURRENT-STATE.md.
DECIDED BY: both
