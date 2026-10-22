# ui-spec.md — UI Specification

> Define all UI components, screens, and design tokens here.
> No UI may be implemented that is not defined here.

## Design Tokens

Colors:
- primary: [hex]
- secondary: [hex]
- error: [hex]
- background: [hex]
- surface: [hex]
- text-primary: [hex]
- text-secondary: [hex]

Typography:
- font-family: [value]
- size-sm: [value]
- size-md: [value]
- size-lg: [value]
- size-xl: [value]

Spacing:
- xs: [value]
- sm: [value]
- md: [value]
- lg: [value]
- xl: [value]

## Screens

### Rediger case (CR-033)

Route: `/case/[id]/rediger`
Purpose: Fylle ut og komplettere en case over tid. Skjemaet skal være oversiktlig for alt fra en liten A/B-test til et stort prosjekt: bare det som er relevant vises, og lagring er alltid mulig (FR-CASE-008).
Components: `EditCaseForm`, `CollapsibleCard`, `MultiSelect`, `ApprovalSection`, `LinksSection` (Materiale); ren logikk i `lib/case-form.ts`.
States: populated (eksisterende case), saving, error (påkrevde felt mangler / API-feil), delete-confirmation.

Oppførsel:
- **Kjerneseksjoner** (alltid synlige som sammenleggbare kort): Grunninfo (kundenavn*, tittel*, beskrivelse*, status, ansvarlig), Klassifisering (bransje, kanal, case-type), Innhold (løsning, effekt). Deretter Bruksgodkjenning og Materiale.
- **Valgfri blokk** — Effektmåling: vises bare når den har innhold, eller når brukeren legger den til via «+ Legg til»-knappen. En blokk med data vises alltid. (Relevans og Interne notater er fjernet, CR-038.)
- **Fremdrift:** hvert kjernekort viser «✓», «N av 3» (Innhold: «N av 2») eller «tom», basert på kravene i FR-CASE-004/005 (grunninfo: kundenavn, tittel, beskrivelse; klassifisering: bransje, kanal, case-type; innhold: løsning og effekt). Lukkede kort viser et kort sammendrag.
- **Åpne kort:** bare første ufullstendige kjernekort er åpent ved innlasting; nye blokker åpnes når de legges til.
- **Kanal, Case-type og Effekttype** er søkbare flervalg (skriv for å filtrere, piltaster, Enter velger, valgte vises som fjernbare chips). Enter sender aldri inn skjemaet fra et flervalg.
- **Effektmåling** viser Effekttype, Hva ble målt, Resultat og Evidensnivå som standard; Før, Etter, Periode og Datakilde ligger under «Flere måledetaljer» (åpen hvis noe er utfylt).
- **Sticky handlingslinje** nederst: Lagre, Avbryt (heter «Lukk» når alt er lagret), «✓ Lagret» (vises etter vellykket lagring til neste endring, `role="status"`), feilmelding, og «⋯»-meny (kun eier/admin) med Eksporter og «Slett case …». Sletting krever bekreftelse med oversikt over filer/lenker og godkjenninger (CR-025).
- Pitchtekst finnes ikke lenger (fjernet i CR-033).

### Åpne en case (CR-036)

Route: `/case/[id]`
Purpose: Eieren åpner en case oftest for å fylle den ut, så de går rett til redigering uten et ekstra steg (FR-CASE-009).

Oppførsel:
- Eier som åpner en case (fra bibliotek, Mine caser, Oppfølging, lenke, eller rett etter opprettelse) sendes til `/case/[id]/rediger`.
- `/case/[id]?visning=1` viser den skrivebeskyttede siden for eieren. «← Tilbake til case» og «Avbryt»/«Lukk» i redigeringsskjemaet sender eieren dit. «Lagre» beholder brukeren i redigering (CR-037).
- Andre brukere, inkludert admin på andres caser, ser den skrivebeskyttede siden uten omdirigering og kan trykke «Rediger». En ikke-eier som åpner `/rediger` sendes til visningen.

### Ny case (CR-033)

Route: `/case/ny`
Purpose: Registrere en case raskt med tre felt (FR-CASE-001). Kundenavn har autofullføring fra eksisterende kunder (`GET /api/customers`); feltet fungerer også uten forslag.

### Case-side: «Dette kan kompletteres» (CR-034)

Route: `/case/[id]`
Purpose: Vise hva som mangler og la eier/admin fylle det ut med ett klikk (FR-MISS-001–004).
Components: `MissingInfoPanel`, `MultiSelect`; ren logikk i `lib/cases.ts` (`getMissingItems`) og `lib/missing-fields.ts`.
States: ikke-eier (ren tekst), eier/admin (klikkbare chips), editor åpen, saving, error.

Oppførsel:
- Panelet vises bare når noe mangler. Chips er gruppert: «For å sette Ferdigstilt» og «For bruk i presentasjoner».
- For eier og admin er redigerbare chips knapper med «+» foran. Andre brukere ser vanlige tekst-chips uten knapper.
- Et klikk åpner en liten editor i panelet for akkurat det feltet; kun én editor er åpen om gangen, og fokus flyttes til feltet.
- Felttyper: Bransje (nedtrekk), Kanal og Case-type (søkbart flervalg), Løsning og Effekt (tekstboks).
- «NDA er satt …» er informasjon og er ikke klikkbar.
- «Lagre» er deaktivert til noe er fylt ut. Lagring sender kun det aktuelle feltet (trimmet). Etter lagring lukkes editoren og siden oppdateres.
- Feil (403, serverfeil, nettverk) vises i editoren; det brukeren skrev beholdes.
- Escape: i et flervalg med åpen forslagsliste lukker første Escape bare listen; Escape ellers (eller «Avbryt») forkaster editoren.

### [Screen Name]

Route: [path]
Purpose: [what does this screen do]
Components: [list of components used]
States: loading | error | empty | populated
