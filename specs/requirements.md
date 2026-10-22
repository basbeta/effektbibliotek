# requirements.md — Requirements

> Basert på docs/01–07. Alle CRs må spore tilbake til ett eller flere krav her.

---

## Functional Requirements

### Auth

**FR-AUTH-001**: Kun e-postadresser som slutter på `@bas.no` skal kunne logge inn.

**FR-AUTH-002**: Innlogging skjer via engangskode (OTP) eller magic link sendt til e-posten — ingen passord, ingen tung brukerkonto-flyt.

**FR-AUTH-003**: Engangskode/lenke er gyldig i maksimalt 5 minutter.

**FR-AUTH-004**: Etter vellykket innlogging sendes brukeren til `/bibliotek`.

**FR-AUTH-005**: Navn kan utledes fra e-postadressen (`fornavn.etternavn@bas.no` → `Fornavn Etternavn`).

---

### Case — oppretting og redigering

**FR-CASE-001**: En case kan opprettes med kun tre felter: kundenavn, tittel og kort beskrivelse.

**FR-CASE-002**: Default-verdier ved opprettelse:
- Status = Påbegynt
- Bruksnivå = Ikke avklart
- Bruksgodkjenning = Ikke sendt
- Ansvarlig = innlogget bruker

**FR-CASE-003**: Case kan redigeres i seksjoner: grunninfo, klassifisering, innhold (løsning og effekt), bruksgodkjenning, materiale, interne notater. Kjernen (grunninfo, klassifisering, innhold, bruksgodkjenning, materiale) er alltid synlig; valgfrie blokker (effektmåling, relevans, interne notater) vises når de har innhold eller brukeren legger dem til (CR-033). Skjermens oppførsel er beskrevet i `specs/ui-spec.md`.

**FR-CASE-004**: Sette status til **Pågår** krever: kundenavn, tittel, beskrivelse, bransje, case-type, kanal, løsning.

**FR-CASE-005**: Sette status til **Ferdigstilt** krever: kundenavn, tittel, beskrivelse, bransje, case-type, kanal, løsning, effekt. Tall er ikke påkrevd. (Feltene problem/kontekst og læring er fjernet, CR-035.)

**FR-CASE-006**: (Fjernet i CR-035.) Feltet «kundevennlig beskrivelse» finnes ikke lenger; den kundevendte godkjenningssiden viser kun kundenavn, casetittel og godkjenningsskjemaet (se FR-PUB-002).

**FR-CASE-007**: Interne notater skal aldri vises på kundevendte sider.

**FR-CASE-008**: Brukeren skal til enhver tid kunne lagre og avslutte redigering, uavhengig av utfyllingsgrad.

---

### Bibliotek — søk og filter

**FR-LIB-001**: Biblioteket er startsiden etter innlogging.

**FR-LIB-002**: Fritekstsøk skal dekke: kundenavn, tittel, kort beskrivelse, løsning, effekt, bransje, case-type, kanal, ansvarlig, tags. (Pitchtekst er fjernet som felt, CR-033; problem og læring er fjernet, CR-035.)

**FR-LIB-003**: Filtrering skal støtte: status, bruksnivå, bransje, case-type, kanal, effekt-type, begrensninger (NDA/anonymisert/konkurranse), ansvarlig.

**FR-LIB-004**: Default sortering: sist oppdatert først. Andre sorteringer: nyligst lagt til, ferdigstilt først, pågår først, alfabetisk kunde, ansvarlig.

**FR-LIB-005**: Hurtigfiltre (kan hardkodes i v1): Kan brukes i presentasjoner, Kun internt, Pågår, Ferdigstilt, Digipost, Post/brev, RCS, Antichurn.

**FR-LIB-006**: Casekort viser: kundenavn, tittel, kort beskrivelse, bransje/kanal/case-type-metadata, effekt, status-badge, bruks-badge, begrensnings-badges, ansvarlig, sist oppdatert.

**FR-LIB-007**: Tomt bibliotek viser hjelpsom tom-tilstand med knapp for å legge inn første case.

---

### Status og bruksnivå

**FR-STATUS-001**: Status og bruksnivå er to separate akser og skal aldri blandes.

**FR-STATUS-002**: Gyldige statusverdier: `Påbegynt`, `Pågår`, `Ferdigstilt`.

**FR-STATUS-003**: Ferdigstilt betyr gjennomført — ikke gammel, arkivert eller mindre relevant.

**FR-USAGE-001**: Gyldige bruksnivåer: `Ikke avklart`, `Kun internt`, `Kan brukes i presentasjoner`.

**FR-USAGE-002**: Begrensninger er egne boolske felter, ikke bruksnivåer: `NDA / skal ikke deles`, `Kun anonymisert`, `Konkurransebruk tillatt`.

**FR-USAGE-003**: Hvis NDA er satt, overstyrer det alle andre bruksvalg og vises tydelig i casekort, case-header og bruksgodkjenningsseksjon.

---

### Bruksgodkjenning — intern flyt

**FR-APPR-001**: Bruksgodkjenning er en separat intern status: `Ikke sendt`, `Åpen`, `Innsendt og låst`.

**FR-APPR-002**: Fra case-detaljsiden kan Bas-person kopiere en ferdig godkjenningstekst som inneholder en unik godkjenningslenke.

**FR-APPR-003**: Kopiering av godkjenningstekst skal sette bruksgodkjenningsstatus til `Åpen` (hvis ikke allerede åpen).

**FR-APPR-004**: Godkjenningslenken er unik per case og vanskelig å gjette.

**FR-APPR-005**: Innsendt bruksgodkjenning viser: sendt inn av (navn, e-post, rolle/tittel), tidspunkt, valg, kommentar.

**FR-APPR-006**: Caseeier og admin kan låse opp bruksgodkjenning med bekreftelsesmodal. Opplåsing skal ikke skje ved uhell.

**FR-APPR-007**: Historikk over alle innsendte bruksgodkjenninger beholdes. Siste innsending gjelder. Ingen bruksgodkjenning slettes automatisk.

---

### Bruksgodkjenning — kundevendt flyt

**FR-PUB-001**: Kundevendt godkjenningsside er public (krever ikke innlogging). Route: `/godkjenning/:caseId/:token`.

**FR-PUB-002**: Siden viser kun: kundenavn, casetittel, kontaktperson i Bas, skjema og beta-notat. Ingen intern navigasjon, interne notater eller andre caser vises.

**FR-PUB-003**: Kunden fyller ut navn (påkrevd), e-post (påkrevd) og rolle/tittel (valgfritt).

**FR-PUB-004**: Kunden velger blant:
- Casen er NDA-belagt og skal ikke deles med andre
- Casen kan presenteres internt i Bas
- Casen kan kun brukes anonymisert
- Casen kan brukes i presentasjoner
- Casen kan brukes i konkurranse

Minst ett valg (eller NDA) er påkrevd.

**FR-PUB-005**: Hvis NDA velges, deaktiveres alle andre valg i UI. Andre valg lagres som false.

**FR-PUB-006**: Bruksgodkjenning kan bare sendes inn én gang per åpen lenke. Etter innsending låses skjemaet.

**FR-PUB-007**: Kunden kan ikke endre en låst bruksgodkjenning uten at en Bas-person låser den opp.

**FR-PUB-008**: Låst side viser forklarende tekst med kontaktperson i Bas og beta-notat.

**FR-PUB-009**: Mapping fra kundens valg til intern bruksnivå:
- NDA valgt → bruksnivå = Ikke avklart, NDA = true, alle andre false
- "Kan brukes i presentasjoner" → bruksnivå = Kan brukes i presentasjoner
- Bare "Kan presenteres internt" → bruksnivå = Kun internt
- Ingen bruksvalg → bruksnivå = Ikke avklart
- "Kun anonymisert" → anonymizedUseOnly = true (begrensning)
- "Konkurranse" → competitionUseAllowed = true (tillegg)

---

### E-postflyt

**FR-EMAIL-001**: Systemet sender engangskode/magic link til Bas-bruker ved innlogging.

**FR-EMAIL-002**: Etter at kunden sender inn bruksgodkjenning sendes bekreftelsesmail til kunden med: kundenavn, casetittel, Bas-kontakt, valg, kommentar, innsenderinfo, tidspunkt, beta-notat.

**FR-EMAIL-003**: Kopi av bekreftelses-e-post sendes til caseeier i Bas med intern lenke til casen.

**FR-EMAIL-004**: Godkjenningsteksten (til utsending til kunde) kopieres manuelt av Bas-person fra systemet — den sendes ikke automatisk av systemet. Dette er bevisst for å beholde personlig tone.

---

### Mine caser

**FR-MINE-001**: Brukeren kan se egne caser i tre kategorier: Jeg er ansvarlig, Jeg har opprettet, Trenger min oppfølging.

**FR-MINE-002**: Hvert caseoppslag viser: kunde, tittel, status, bruksnivå, hva som mangler, sist oppdatert.

---

### Oppfølging

**FR-OPPS-001**: Oppfølgingssiden viser caser gruppert etter hva som mangler: effekt, bruksgodkjenning, kanal/case-type, ikke oppdatert på lenge. (Gruppene «pitchtekst» (CR-033) og «kundevennlig beskrivelse» (CR-035) er fjernet sammen med feltene.)

**FR-OPPS-002**: Fra oppfølging kan bruker åpne, redigere og kopiere godkjenningstekst direkte.

---

### Mangler-panel

**FR-MISS-001**: Systemet beregner og viser hva som mangler for å sette Pågår, sette Ferdigstilt og for bruk i presentasjoner.

**FR-MISS-002**: Mangler skal vises hjelpsomt, ikke som feil. Bruk tekst som "Dette kan kompletteres", ikke "Feil" eller "Ugyldig".

**FR-MISS-003**: Blokkerende feilmelding brukes kun når brukeren faktisk prøver en handling som ikke er tillatt (f.eks. sette Ferdigstilt uten nødvendig info).

**FR-MISS-004** (CR-034): Eier og admin kan fylle ut et manglende felt direkte fra mangler-panelet på case-siden, uten å åpne redigeringsskjemaet. Lagringen skriver kun det aktuelle feltet. Andre brukere ser panelet som ren informasjon.

---

### Materiale og lenker

**FR-MAT-001**: V1 støtter lenker som materiale. Filopplasting er future scope.

**FR-MAT-002**: Lenketyper: Presentasjon, Rapport, Dashboard, Figma, Kampanje, Nettside, Dokumentasjon, Annet.

---

### Admin

**FR-ADMIN-001**: Admin-bruker kan redigere alle caser, endre ansvarlig, låse opp bruksgodkjenning og administrere admin-brukere.

**FR-ADMIN-002**: Sletting av case kan utsettes i v1 eller begrenses til admin.

**FR-ADMIN-003**: V1 skal ikke ha tung rollemodell. Anbefalt tilgangsnivå: alle @bas.no-brukere kan lese og opprette; caseeier og admin kan redigere og låse opp bruksgodkjenning.

---

## Non-Functional Requirements

**NFR-001 — Sikkerhet (auth)**: Kun e-postadresser med domene `@bas.no` kan autentisere seg. Engangskode/token er kortlivet (≤ 5 minutter).

**NFR-002 — Sikkerhet (public endpoint)**: Public godkjenningsendepunkt returnerer kun kundenavn, casetittel, caseeier-navn/e-post og bruksgodkjenningsstatus. Interne data, notater, andre caser og brukerlister eksponeres ikke.

**NFR-003 — Sporbarhet**: Alle innsendte bruksgodkjenninger beholdes i historikk og kan ikke overskrives eller slettes automatisk.

**NFR-004 — Token-sikkerhet**: Godkjenningstoken skal være vanskelig å gjette (kryptografisk tilfeldig). Public lenke gir ikke tilgang til intern app.

**NFR-005 — Brand**: Teksten "Bas" og "Bas Kommunikasjon" brukes konsekvent overalt. "BAS" (all caps) er forbudt i UI, e-poster, kundetekster og systemmeldinger.

**NFR-006 — Beta-notat**: Beta-notatteksten er obligatorisk på alle kundevendte flater (godkjenningsside, bekreftelsesside, låst side, bekreftelsesmail, godkjenningstekst som kopieres til kunde).

**NFR-007 — Tone**: Språket skal være nedpå, klart og lite juridisk. Ingen compliance-språk, aggressive feilmeldinger eller corporate tone.

**NFR-008 — Responsivitet**: Desktop er primær plattform. Kundevendt godkjenningsside og innlogging skal fungere godt på mobil.

**NFR-009 — Enkelhet**: V1 skal ikke bli et enterprise-system. Foretrekk enkel, vedlikeholdbar implementering over avansert arkitektur.

---

## Enum-verdier (styrende labels)

### CaseLifecycleStatus
| Kode | Norsk label |
|---|---|
| started | Påbegynt |
| ongoing | Pågår |
| completed | Ferdigstilt |

### CaseUsageLevel
| Kode | Norsk label |
|---|---|
| not_cleared | Ikke avklart |
| internal_only | Kun internt |
| presentation_allowed | Kan brukes i presentasjoner |

### UsageApprovalStatus
| Kode | Norsk label |
|---|---|
| not_requested | Ikke sendt |
| open | Åpen |
| submitted_locked | Innsendt og låst |

### Industry
Retail, Bank / finans, Forsikring, Telekom, Energi, Offentlig, Helse, Reiseliv, B2B, Annet

### CaseType
Salg / konvertering, Kundereise, Automatisering, Lojalitet, Leadgenerering, Winback, Onboarding, Varsling, Dokumentutsendelse, Kundeinnsikt, Konsept / pilot, Kostnadsreduksjon, Antichurn, Annet

### Channel
SMS, RCS, E-post, Push, Web, Landingsside, Chatbot, API, Paid media, Post / brev, Digipost, Fysisk / butikk, Flere kanaler, Annet

### EffectType
Økt salg, Økt konvertering, Redusert kostnad, Økt respons, Økt trafikk, Bedre kundeopplevelse, Tidsbesparelse, Økt leveringsgrad, Dokumentert mottak, Redusert manuelt arbeid, Dokumentert læring, Kvalitativ effekt

---

## Recommended Implementation Order
1. Auth for Bas-brukere
2. Case CRUD (opprett/les/rediger)
3. Bibliotek med søk og filtre
4. Case-detaljside
5. Status og bruksnivå
6. Bruksgodkjenning — intern flyt
7. Kundevendt bruksgodkjenningsside
8. E-postflyt
9. Mine caser
10. Oppfølging
11. Materiale/lenker
12. Enkel admin

---

## Out of Scope (v1)
- Arkivering av caser (fremtidig handling, ikke status)
- Offentlig bruk som eget bruksnivå
- Full filopplasting
- Full versjonshistorikk for caser
- Full audit-logg
- Avansert rollemodell
- CRM-integrasjon
- Presentasjonsgenerering
- AI-generering av case fra rånotater
- Kundepålogging
- Avansert analytics
