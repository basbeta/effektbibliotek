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
- **Kjerneseksjoner** (alltid synlige som sammenleggbare kort): Grunninfo (kundenavn*, tittel*, beskrivelse*, status, ansvarlig), Klassifisering (bransje, kanal, case-type), Innhold (problem/kontekst, løsning, effekt, læring). Deretter Bruksgodkjenning og Materiale.
- **Valgfrie blokker** — Effektmåling, Relevans, Kundevennlig tekst, Interne notater: vises bare når de har innhold, eller når brukeren legger dem til via «+ Legg til»-knappene. Blokker med data vises alltid.
- **Fremdrift:** hvert kjernekort viser «✓», «N av 3» eller «tom», basert på kravene i FR-CASE-004/005 (grunninfo: kundenavn, tittel, beskrivelse; klassifisering: bransje, kanal, case-type; innhold: problem, løsning, effekt eller læring). Lukkede kort viser et kort sammendrag.
- **Åpne kort:** bare første ufullstendige kjernekort er åpent ved innlasting; nye blokker åpnes når de legges til.
- **Kanal, Case-type og Effekttype** er søkbare flervalg (skriv for å filtrere, piltaster, Enter velger, valgte vises som fjernbare chips). Enter sender aldri inn skjemaet fra et flervalg.
- **Effektmåling** viser Effekttype, Hva ble målt, Resultat og Evidensnivå som standard; Før, Etter, Periode og Datakilde ligger under «Flere måledetaljer» (åpen hvis noe er utfylt).
- **Sticky handlingslinje** nederst: Lagre, Avbryt, feilmelding, og «⋯»-meny (kun eier/admin) med Eksporter og «Slett case …». Sletting krever bekreftelse med oversikt over filer/lenker og godkjenninger (CR-025).
- Pitchtekst finnes ikke lenger (fjernet i CR-033).

### Ny case (CR-033)

Route: `/case/ny`
Purpose: Registrere en case raskt med tre felt (FR-CASE-001). Kundenavn har autofullføring fra eksisterende kunder (`GET /api/customers`); feltet fungerer også uten forslag.

### [Screen Name]

Route: [path]
Purpose: [what does this screen do]
Components: [list of components used]
States: loading | error | empty | populated
