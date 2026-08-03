# CR-011: Faktisk rotårsak for hengende OTP-innlogging — manglende databaseskjema + manglende feilhåndtering

**Status:** Done
**Created:** 2026-08-03

---

## Business Goal
Innlogging (OTP på e-post) skal fungere på `effektbibliotek.basbeta.no`, og enhver fremtidig feil skal vises til brukeren i stedet for å henge skjermen på ubestemt tid.

## Problem Statement
Verken CR-009 (SMTP-timeout) eller CR-010 (databasetilkoblings-timeout) løste hengingen, selv etter bekreftet vellykket redeploy av begge. Coolify sine runtime-logger avslørte den faktiske årsaken:

```
No migration found in prisma/migrations
No pending migrations to apply.
...
Error [PrismaClientKnownRequestError]: Invalid `prisma.otpCode.create()` invocation:
The table `public.OtpCode` does not exist in the current database.
code: 'P2021'
```

**Rotårsak 1 — tomt databaseskjema:** Repoet har aldri hatt en `prisma/migrations`-mappe, verken før eller etter CR-008. Den opprinnelige Neon-databasen ble provisjonert med `prisma db push` (deklarativt, ingen migreringshistorikk), ikke `prisma migrate dev`. `Dockerfile` sin `CMD` kjører `prisma migrate deploy`, som — uten migreringsfiler å anvende — fullfører uten feil, men lager ingen tabeller. Den ferske Coolify-databasen har derfor stått helt tom siden CR-008 ble deployet. Tilkoblingen i seg selv er øyeblikkelig og feilfri (derfor hjalp ikke CR-010 sin timeout — det var aldri et tilkoblingsproblem).

**Rotårsak 2 — ingen feilhåndtering i API-routen viste seg som en frontend-hang:** `app/api/auth/request-code/route.ts` hadde ingen `try/catch` rundt databasekallene. Når Prisma kastet en uhåndtert feil, var ikke Next.js sitt standard 500-svar garantert gyldig JSON. `app/(auth)/login/page.tsx` gjør `await res.json()` uten feilhåndtering — hvis dette kastet en parse-feil, kjørte aldri `setLoading(false)` (linjen rett etter), og "Send engangskode"-knappen ble stående på "Sender…" for alltid. Serveren svarte altså på millisekunder — nettleseren fikk det bare aldri vite. Dette er hvorfor CR-009 og CR-010 sine 10-sekunders timeouts ikke endret noe synlig: requesten hang aldri på serversiden i utgangspunktet.

## Proposed Solution
1. **`Dockerfile`:** Endre CMD fra `npx prisma migrate deploy && npm run start` til `npx prisma db push --skip-generate && npm run start`. Matcher hvordan prosjektet faktisk har blitt driftet historisk (aldri formelle migreringer). `--skip-generate` fordi Prisma-klienten allerede genereres i build-steget (`prisma generate && next build`).
2. **`app/api/auth/request-code/route.ts`:** Wrap databasekallene og e-postutsendingen i `try/catch`, returner en garantert JSON 500-feil (`{ error: "..." }`) ved uventede feil, med `console.error` for feilsøking i Coolify-loggene.

## Impact Analysis

### Affected Components
- `Dockerfile`
- `app/api/auth/request-code/route.ts`

### Database Impact
Neste deploy vil kjøre `prisma db push` mot den tomme Coolify-databasen og opprette alle tabeller fra `prisma/schema.prisma`. Ingen eksisterende data berøres (databasen er allerede tom).

### API Impact
`POST /api/auth/request-code` returnerer nå alltid gyldig JSON, også ved uventede serverfeil.

### UX Impact
Innlogging skal nå fungere. Hvis noe fortsatt går galt, vil brukeren se en konkret feilmelding i stedet for en evig spinner.

### Security Impact
Ingen. `console.error` logger kun feilobjektet server-side (Coolify-logger), ikke til klienten.

### Performance Impact
Ingen i normal drift.

## Acceptance Criteria
- [ ] Innlogging med gyldig `@bas.no`-adresse på `effektbibliotek.basbeta.no` fungerer ende-til-ende: OTP mottas på e-post, verifiseringssiden fungerer
- [ ] Ved en eventuell fremtidig serverfeil i request-code: brukeren ser en feilmelding, ikke en hengende knapp

## Required Tests
- [ ] Manuell: be om engangskode på prod etter deploy, verifiser at e-post ankommer og at innlogging fullføres
- [ ] Manuell: verifiser i Coolify database-ressursen at tabeller nå eksisterer (`User`, `OtpCode`, `Case`, osv.)

## Rollback Strategy
Reverter begge filer til forrige commit. Merk: hvis `db push` allerede har opprettet tabeller, er det ingen grunn til å rulle tilbake skjemaet — kun kodeendringen.

## Migration Strategy
Ingen datamigrasjon (databasen var allerede tom). Fremtidig skjemaendring vil fortsatt gå via `db push` ved neste deploy, med mindre prosjektet på et senere tidspunkt bevisst går over til formelle `prisma migrate`-migreringer (anbefales før prosjektet får ekte produksjonsdata av verdi — se Risks).

## Risks
- **Medium, fremtidig:** `prisma db push` har ingen migreringshistorikk og kan i verste fall foreslå datatap-operasjoner ved fremtidige skjemaendringer uten en tydelig, reviewbar SQL-diff slik `migrate` gir. Grei for et beta-prosjekt uten verdifull produksjonsdata nå, men bør vurderes erstattet med formelle migreringer før effektbiblioteket har ekte data som må bevares over tid.
- Lav: try/catch-endringen er additiv og endrer ikke suksess-stien.

## Dependencies
- CR-008 (Done) — Coolify/Hetzner/Brevo-migreringen denne bygger videre på
- CR-009, CR-010 (Done) — samme feilsøkingskjede; ingen av dem var feil, de adresserte reelle (men ikke de utløsende) manglene

## Validation Notes
Diagnostisert direkte fra Coolify sine runtime-logger (Prisma-feilkode P2021, `TableDoesNotExist`) — ikke gjetning. TS-kompilering ikke kjørbar i denne økten (node/npm ikke tilgjengelig i shell-miljøet); begge endringer er små og visuelt verifisert (ett CMD-felt, én try/catch-wrapping av eksisterende logikk uten strukturendring).

**Oppdatering samme dag (forsøk 2):** Første forsøk (`prisma db push --skip-generate`, uten `--accept-data-loss`) crashet containeren — 10x restart-loop, "Exited (10x restarts) Stopped after reaching restart limit (10/10)" i Coolify. Antok først interaktiv bekreftelse uten TTY som årsak, la til `--accept-data-loss`.

**Oppdatering samme dag (forsøk 3):** Fikk denne gang faktisk tak i container-loggene (via Logs-fanen med riktig container-instans valgt). Den ekte feilen var noe helt annet enn antatt: `! unknown or unexpected option: --skip-generate` — denne Prisma CLI-versjonen (7.x) godtar ikke `--skip-generate` på `db push` i det hele tatt. Kommandoen feilet umiddelbart på et ugyldig flagg, `&&`-kjeden stoppet, `npm run start` kjørte aldri, helsesjekk feilet, restart-loop. `--accept-data-loss`-hypotesen var aldri testet isolert — det spiller ingen rolle siden roten var flagg-parsing, ikke en interaktiv prompt. Fjernet `--skip-generate` (var uansett bare en mikro-optimalisering — klienten er allerede generert i build-steget). Endelig CMD: `npx prisma db push --accept-data-loss && npm run start`.

**Bekreftet løst (commit 0377011):** Container status gikk til "Running" (ikke lenger crash-loop). Produkteier logget inn på `effektbibliotek.basbeta.no`, mottok engangskode på e-post, og fullførte innlogging. Hele feilsøkingskjeden (CR-009 → CR-010 → CR-011) er dermed verifisert i faktisk produksjon.
