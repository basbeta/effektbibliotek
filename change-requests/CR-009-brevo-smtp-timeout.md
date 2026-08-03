# CR-009: SMTP-timeout for Brevo-transportøren (bugfix: OTP-innlogging henger)

**Status:** Done
**Created:** 2026-08-03

---

## Business Goal
Innlogging (OTP på e-post) skal fungere pålitelig på `effektbibliotek.basbeta.no`.

## Problem Statement
Etter at CR-008 (port til Hetzner/Coolify/PostgreSQL 18 + Brevo SMTP) ble satt i produksjon, henger `POST /api/auth/request-code` uten å sende e-post eller returnere en feil.

`lib/email.ts` sin `nodemailer`-transportør for Brevo hadde ingen `connectionTimeout`/`greetingTimeout`/`socketTimeout` satt. Hvis SMTP-tilkoblingen til `smtp-relay.brevo.com:587` av en eller annen grunn ikke fullføres (feil/manglende `BREVO_SMTP_LOGIN`/`BREVO_SMTP_KEY` i Coolify sine miljøvariabler, eller utgående SMTP-trafikk blokkert av Hetzner/serverens brannmur), venter `nodemailer` på ubestemt tid i stedet for å feile — noe som oppleves som at innloggingen "bare spinner".

## Proposed Solution
Legge til 10 sekunders `connectionTimeout`, `greetingTimeout` og `socketTimeout` på transportøren i `lib/email.ts`, slik at en SMTP-feil feiler raskt og synlig (kaster en feil som API-routen returnerer som 500) i stedet for å henge.

Dette løser selve hendelsen, men ikke nødvendigvis rotårsaken til *hvorfor* SMTP-tilkoblingen feiler — det krever verifisering direkte i Coolify (se Validation Notes).

## Impact Analysis

### Affected Components
- `lib/email.ts`

### Database Impact
Ingen

### API Impact
`POST /api/auth/request-code` feiler nå innen ~10s ved SMTP-problemer, i stedet for å henge på ubestemt tid.

### UX Impact
Bruker får en feilmelding fremfor en evig spinner ved SMTP-feil. Løser ikke automatisk selve e-postleveransen dersom credentials/nettverk er feil — krever fortsatt verifisering i Coolify.

### Security Impact
Ingen

### Performance Impact
Ingen i normal drift.

## Acceptance Criteria
- [ ] Innlogging med gyldig `@bas.no`-adresse på `effektbibliotek.basbeta.no` sender OTP-epost og fungerer ende-til-ende
- [ ] Ved SMTP-feil returnerer requesten en feil innen ~10 sekunder, ikke en hengende spinner

## Required Tests
- [ ] Manuell: be om engangskode på prod, verifiser at e-post ankommer
- [ ] Manuell: verifiser i Coolify at `BREVO_SMTP_LOGIN`, `BREVO_SMTP_KEY` og `FROM_EMAIL` faktisk er satt på app-ressursen (ikke bare i `.env.example`)

## Rollback Strategy
Fjern de tre timeout-feltene fra `lib/email.ts`.

## Migration Strategy
Ingen.

## Risks
Lav — endringen er additiv og påvirker kun feilhåndtering, ikke normal drift.

## Dependencies
- CR-008 (Done) — Brevo SMTP-transportøren denne bygger videre på

## Validation Notes
Timeout-fiksen adresserer symptomet (hengende request), ikke nødvendigvis rotårsaken. To ting bør verifiseres manuelt i Coolify av produkteier:
1. At `BREVO_SMTP_LOGIN` og `BREVO_SMTP_KEY` faktisk er satt som miljøvariabler på **app-ressursen** i Coolify (ikke bare dokumentert i `.env.example`) — mest sannsynlige årsak til at det ikke har fungert i det hele tatt.
2. At Hetzner-serveren tillater utgående trafikk på port 587 til `smtp-relay.brevo.com`. Hetzner Cloud blokkerer port 25 (SMTP) som standard på nye servere for å hindre spam, men port 587 (submission) skal normalt være åpen — bør likevel bekreftes med f.eks. `nc -zv smtp-relay.brevo.com 587` fra serveren.

TS-kompilering ikke kjørbar i denne økten (node/npm ikke tilgjengelig i shell-miljøet) — kodeendringen er minimal (kun tre nye numeriske felt i et eksisterende objekt) og visuelt verifisert.
