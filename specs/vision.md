# vision.md — Product Vision

> Basert på docs/01–07. Alle CRs må være i tråd med visjonen her.

## Product Name
Effektbibliotek

## One-Line Description
Et internt arbeidsverktøy for Bas Kommunikasjon som samler caser, tester, læring og dokumentert effekt på ett sted — slik at ansatte enklere kan finne relevante referanser, lære av tidligere arbeid og dokumentere hva som faktisk ble gjort.

## Problem Being Solved
Nyttige caser, tester og effekter forsvinner i Slack, e-post, presentasjoner og enkeltpersoners hukommelse. Hvis en case først skal dokumenteres etter at arbeidet er helt ferdig, er det ofte for sent: folk gidder ikke, informasjonen er glemt, materiale ligger spredt, og kunden er mindre villig til å godkjenne bruk. Læringen blir ikke tilgjengelig for andre.

## Target Users
Ansatte i Bas Kommunikasjon med @bas.no e-postadresse. I tillegg: kundekontakter hos Bas sine kunder (kun for å gi bruksgodkjenning via kundevendt skjema uten innlogging).

## Core Value Proposition
Effektbiblioteket senker terskelen for å registrere caser tidlig — også før de er perfekte. Systemet hjelper brukeren å komplettere casen over tid, ikke krev fullstendighet for å registrere. Det gjør det lett å finne relevante caser, og gjør det mulig å dokumentere bruksgodkjenning fra kunder på en enkel, sporbar og kundevennlig måte.

Kjerneprinsipp: **Ikke ferdig er bedre enn ikke registrert.**

## The Three Core Jobs
1. **Finne relevant case** — raskt søke, filtrere og finne caser basert på kunde, bransje, kanal, løsning eller effekt.
2. **Legge inn ny case** — registrere en ny case raskt med få påkrevde felter.
3. **Komplettere eller forbedre en case** — se hva som mangler, redigere casen, legge til informasjon og håndtere bruksgodkjenning.

## What a Case Can Be
En case er ikke bare en klassisk ferdig referansecase. En case kan være:
- En gjennomført kampanje, test, pilot eller kundereise
- En automatisering, dokumentutsendelse eller antichurn-aktivitet
- Et winback-løp, onboarding eller varsling
- En læring fra et tiltak
- En idé eller case som er påbegynt
- Et prosjekt som fortsatt pågår

## Status Model (styrende krav)
Status beskriver case-livsløp — ikke hva casen kan brukes til.

| Status | Betyr |
|---|---|
| Påbegynt | Casen er registrert, men ikke godt nok beskrevet ennå |
| Pågår | Casen/testen/prosjektet er aktivt eller under arbeid |
| Ferdigstilt | Casen/testen/leveransen er gjennomført |

**Ferdigstilt betyr gjennomført, ikke gammel, arkivert eller mindre relevant.**

## Usage Level Model (styrende krav)
Bruk er en separat akse fra status — beskriver hva casen kan brukes til.

| Bruksnivå | Betyr |
|---|---|
| Ikke avklart | Default. Ikke bruk uten videre vurdering |
| Kun internt | Kan brukes internt i Bas (læring, inspirasjon, deling) |
| Kan brukes i presentasjoner | Kan brukes i kundemøter, tilbud og faglige sammenhenger |

Begrensninger/tillegg (egne akser):
- **NDA / skal ikke deles** — overstyrer alle andre valg. Casen skal ikke brukes uten ny bruksgodkjenning.
- **Kun anonymisert** — kundenavn, logo og identifiserende detaljer skal ikke brukes.
- **Konkurransebruk tillatt** — kan brukes som grunnlag for bransjekonkurranser.

## Brand Rule (obligatorisk)
Skriv alltid **Bas** eller **Bas Kommunikasjon**. Aldri **BAS**. Gjelder UI, e-poster, kundetekster, systemmeldinger og all dokumentasjon.

## Beta Notice (obligatorisk på kundevendte flater)
Kundevendte sider og e-poster skal inneholde:
> Effektbiblioteket er foreløpig i betatesting. Gi gjerne beskjed til kontaktpersonen din i Bas hvis noe er uklart, feil eller burde fungere annerledes.

## Out of Scope (v1)
- Avansert rollemodell
- Full CRM-integrasjon
- Automatisk presentasjonsgenerering
- AI-generering av case fra rånotater
- Kundepålogging
- Avansert godkjenningsworkflow
- Offentlig publisering av caser
- Avansert analytics
- Full audit-logg
- Full versjonshistorikk
- Avansert filhåndtering
- Arkivering av caser (kan legges til som eksplisitt handling senere, ikke som status)

## Success Metrics
V1 lykkes hvis:
- Ansatte faktisk legger inn caser tidlig
- En case kan registreres på få minutter
- Det er lett å finne relevante caser
- Det er tydelig hva en case kan brukes til
- Bruksgodkjenning kan innhentes uten tung prosess
- Kunden forstår hva de godkjenner
- Bas kan stole på at brukstillatelser er sporbare
- Ferdigstilte caser ikke oppleves som gamle eller arkiverte
- Systemet hjelper brukeren uten å mase

## Visual Direction
- Visuell følelse: rolig, redaksjonelt bibliotek — ikke CRM, sakssystem eller enterprise-dashboard
- Primærbakgrunn: `#F7F4EF` (varm off-white)
- Primær accent: `#1F4D3A` (dyp grønn)
- Font: Inter
- Badges: rolige og subtile; NDA-badge alltid tydelig og prioritert
- Kort bruker subtil border, ikke tung shadow
