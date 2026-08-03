# CR-013: Direkte utsending av bruksgodkjenningsforespørsel på e-post

**Status:** Done
**Created:** 2026-08-03

---

## Business Goal
Nå som e-post er verifisert fungerende i produksjon (CR-009–CR-011) og feilsporing er på plass (CR-012), skal Bas-representanten kunne sende bruksgodkjenningsforespørselen direkte fra Effektbiblioteket — ikke lenger kopiere tekst og sende manuelt via eget e-postprogram.

## Problem Statement
Tidligere fungerte bruksgodkjenning slik: Bas-representanten trykket "Kopier godkjenningstekst", limte den inn i et eget e-postprogram, og sendte den manuelt til kundens kontaktperson. Systemet visste ingenting om hvem den spesifikke godkjenneren var — kun `customerName` (kundens/selskapets navn) var lagret.

## Proposed Solution
1. **`prisma/schema.prisma`** — nye felt på `Case`: `approverName String?`, `approverEmail String?`
2. **`lib/usage-approval.ts`** — `buildApprovalText` personaliserer hilsenen ("Hei {navn},") når `approverName` er oppgitt
3. **`lib/email.ts`** — ny funksjon `sendUsageApprovalRequest`: sender til godkjenneren (`to`), med caseeier på kopi (`cc`), via eksisterende Brevo-transportør
4. **Ny route:** `app/api/cases/[id]/send-approval-request` (erstatter `copy-approval-text`, som er fjernet) — validerer navn/e-post, sender e-post, lagrer `approverName`/`approverEmail` på casen, og setter `usageApprovalStatus` til `open` hvis den var `not_requested`
5. **`components/cases/ApprovalSection.tsx`** — "Kopier godkjenningstekst"-knappen er erstattet med et inline skjema (navn + e-post + "Send"-knapp) direkte i godkjenningswidgeten på case-detaljsiden. Viser "Sendt til [navn] ([e-post]) — venter på svar" når status er `open`, og tillater å sende på nytt (f.eks. med ny/annen godkjenner)

## Impact Analysis

### Affected Specs
- [ ] specs/flows.md — bruksgodkjenningsflyten bør oppdateres til å reflektere direkte utsending i stedet for kopier-lim-inn

### Affected Components
- `prisma/schema.prisma`
- `lib/usage-approval.ts`
- `lib/email.ts`
- `app/api/cases/[id]/send-approval-request/route.ts` (ny)
- `app/api/cases/[id]/copy-approval-text/route.ts` (fjernet)
- `components/cases/ApprovalSection.tsx`
- `app/(app)/case/[id]/page.tsx`

### Database Impact
To nye nullable felt på `Case` (`approverName`, `approverEmail`). Ingen migrasjon nødvendig utover neste `prisma db push` ved deploy (se CR-011 for hvorfor dette prosjektet bruker `db push`, ikke formelle migreringer).

### API Impact
- Fjernet: `POST /api/cases/[id]/copy-approval-text`
- Ny: `POST /api/cases/[id]/send-approval-request` — body `{ approverName, approverEmail }`, samme auth-mønster som `unlock-approval` (eier eller admin)

### UX Impact
Bas-representanten fyller inn navn og e-post til godkjenneren direkte på case-siden og trykker send — ingen manuell e-postutsending lenger. Godkjenneren mottar e-posten direkte; Bas-representanten (caseeier) får kopi (cc).

### Security Impact
Ingen ny autentiseringslogikk — gjenbruker eksisterende eier/admin-sjekk. E-postadresse til godkjenner lagres i klartekst i databasen (samme nivå som andre kontaktfelt i appen).

### Performance Impact
Ingen.

## Acceptance Criteria
- [x] Lokal `npm run build` fullfører uten feil
- [ ] Manuell test i produksjon: fyll inn navn+e-post på en case, trykk send, verifiser at godkjenneren mottar e-post og caseeier får kopi
- [ ] Verifiser at godkjenningslenken i e-posten fungerer som før

## Required Tests
- [x] Lokal build verifisert grønn
- [ ] Manuell ende-til-ende-test i produksjon (gjenstår — se CURRENT-STATE.md)

## Rollback Strategy
Reverter denne commiten. `approverName`/`approverEmail`-feltene er nullable og additive — trygt å stå urørt selv ved en delvis rollback av UI/API-lag.

## Migration Strategy
Ingen datamigrasjon. Eksisterende caser uten `approverName`/`approverEmail` viser tomt skjema som før — ingen brudd.

## Risks
Lav — additiv endring. Feil i utsending fanges av try/catch og rapporteres til Bugsink (CR-012-mønster).

## Dependencies
- CR-009–CR-011 (Done) — pålitelig e-postutsending i produksjon
- CR-012 (Done) — feilsporing, brukt i den nye routen

## Validation Notes
`npm run build` kjørt lokalt og bekreftet grønn, inkludert ny Prisma-klient med `approverName`/`approverEmail`.

**Oppdatering — bug funnet ved første reelle test:** Godkjenningslenken i den utsendte e-posten pekte på `https://localhost:3000/godkjenning/...` i stedet for `https://effektbibliotek.basbeta.no/...`. Rotårsak: `send-approval-request/route.ts` bygde lenken med `new URL(request.url).origin`, som viste seg upålitelig i API-routes bak Coolify sin Traefik-proxy (i motsetning til i `proxy.ts`/middleware, der samme mønster fortsatt fungerer korrekt — bekreftet av at innloggingsredirect har fungert hele kvelden). Samme latente feil fantes også i `lib/email.ts` sin `APP_URL`-konstant (brukt i "Se casen her"-lenken til caseeier), som er avhengig av `NEXT_PUBLIC_APP_URL` — denne variabelen var aldri lagt til i Coolify sin env-var-liste.

Fikset: `send-approval-request/route.ts` bruker nå `process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin` (env-var først, request-fallback for lokal dev). `NEXT_PUBLIC_APP_URL=https://effektbibliotek.basbeta.no` lagt til i `.env.example` og `docs/COOLIFY-DEPLOY.md` — **må settes i Coolify før neste deploy**, ellers gjentas bugen.
