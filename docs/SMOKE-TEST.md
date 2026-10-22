# Manuell smoke-test (produksjon)

> Dekker det de automatiserte testene (`npm test`, CR-032) ikke kan: ekte database, S3, SMTP og UI.
> Kjør etter avhengighetsoppgraderinger, Prisma-/migreringsendringer og endringer i e-post, filhåndtering eller innlogging.
> Første gang kjørt 2026-10-20 etter CR-031. Utvidet 2026-10-21 med skjemaflyten (CR-033) og fyll-ut-fra-panel (CR-034).

## Regler
- Bruk **kun en egen test-case**. Rør aldri kollegaers caser.
- Bruk tydelig fiktive data (f.eks. kunde `TESTKUNDE <CR-nr>`, tittel `TEST <CR-nr> smoke-test (slettes)`). Ingen ekte kundenavn, ingen personopplysninger.
- Send godkjenningsforespørselen til **din egen** adresse (f.eks. privat e-post), aldri til en ekte kunde.
- Slett test-casen til slutt (steg 7). Slett også testmailene fra innboksen.
- Forhåndskrav: du er innlogget med en `@bas.no`-bruker. Har du ikke kode, test innlogging først (steg 0).

## Steg

### 0. Innlogging (OTP)
1. Logg ut, gå til `/login`, skriv inn din `@bas.no`-adresse.
2. **Forventet:** e-post med 6-sifret kode kommer innen ~1 minutt; koden logger deg inn.

### 1. Opprett test-case
1. «+ Ny Case» → fyll ut kunde, tittel og beskrivelse (fiktive data) → «Opprett case».
2. **Forventet:** du lander på case-siden, status «Påbegynt», «Ikke avklart».

### 1b. Redigeringsskjemaet (CR-033)
1. Åpne casen. **Forventet:** som eier havner du direkte i redigering (`/rediger`, CR-036); ellers trykker du «Rediger» på case-siden. Kortene Grunninfo, Klassifisering og Innhold vises lukket/åpen etter hvor mye som er utfylt; bare det første ufullstendige kortet er åpent; hvert kort viser «✓», «N av 3» (Innhold: «N av 2») eller «tom».
2. Åpne Klassifisering. I **Kanal**: skriv `sm`, trykk Enter. **Forventet:** «SMS» legges til som chip, og skjemaet sendes **ikke** inn. Trykk Escape (bare listen lukkes) og ta bort chipen med ×.
3. Velg minst bransje, én kanal og én case-type (f.eks. «auto» → Automatisering).
4. Trykk «+ Effektmåling» under «Legg til». **Forventet:** blokken åpnes med Effekttype, Hva ble målt, Resultat, Evidensnivå og «Flere måledetaljer» (Før, Etter, Periode, Datakilde).
5. Fyll ut noe og trykk «Lagre». **Forventet:** du blir **stående** i redigering (ingen navigasjon, åpne kort og scrollposisjon beholdes), «✓ Lagret» vises ved siden av knappene, og «Avbryt» heter nå «Lukk». Endre noe til: «Lagret» forsvinner. Trykk «Lukk» (eller «← Tilbake til case») for å se den skrivebeskyttede siden med alt du fylte ut.
6. Åpne «Rediger» igjen og trykk «Lagre» uten å endre noe. **Forventet:** «✓ Lagret», og case-siden (via «Lukk») er identisk (ingenting går tapt).
7. Nederst: «⋯» → «Eksporter …» og «Slett case …» (slettingen testes i steg 7 nedenfor).
8. På «Ny case»: skriv de første bokstavene av en kunde som finnes fra før. **Forventet:** nettleseren foreslår eksisterende kundenavn.

### 1c. Fyll ut fra «Dette kan kompletteres» (CR-034)
Brukes på en case der noe mangler (en ny test-case mangler alt). Gjelder eier og admin.
1. På case-siden: chipene under «Dette kan kompletteres» har «+» foran. **Forventet:** «NDA er satt …» (hvis den vises) er vanlig tekst, ikke klikkbar.
2. Klikk «+ Bransje». **Forventet:** en liten editor åpnes med fokus i feltet, og «Lagre» er **deaktivert** til du har valgt noe. Velg en bransje og lagre. **Forventet:** chipen forsvinner, og bransjen vises på siden.
3. Klikk «+ Kanal»: skriv `sm`, Enter, Escape (bare listen lukkes, editoren blir stående), «Lagre». Gjenta for «+ Case-type».
4. Klikk «+ Løsning», skriv noe og trykk **Avbryt**. **Forventet:** ingenting lagres. Åpne igjen: feltet er tomt. Skriv, og lagre denne gangen.
5. Gjenta for «+ Effekt» (lagres som Effekt; Løsning er urørt).
6. Kontroller at feltene Problem / kontekst, Læring og Kundevennlig beskrivelse **ikke** finnes (verken i skjemaet, på case-siden eller som chips), og at godkjenningssiden (steg 6) bare viser kundenavn, tittel og skjemaet — ingen beskrivelsesboks. (Fjernet i CR-035.)
7. **Forventet til slutt:** når ingenting mangler, forsvinner hele «Dette kan kompletteres»-panelet.
8. (Hvis mulig, med en annen konto som ikke er eier/admin) panelet viser vanlig tekst uten «+» og uten klikk.

### 2. Bruksgodkjenning — send
1. Åpne «Bruksgodkjenning» på case-siden.
2. Fyll inn et testnavn og **din egen** e-postadresse. Forhåndsvisningen skal vise samme tekst som sendes.
3. «Send godkjenningsforespørsel».
4. **Forventet:** Seksjonen viser «Sendt til … — venter på svar», status «Åpen».

### 3. Bruksgodkjenning — verifiser e-posten
I mottatt e-post (åpne «show details»/«vis detaljer»):
- `from` = `effektbibliotek@basbeta.no`
- `reply-to` = caseeierens e-post (den som er innlogget)
- `cc` = caseeierens e-post
- `to` = adressen du skrev inn
- Lenken peker på `https://effektbibliotek.basbeta.no/godkjenning/<caseId>/<token>` (ikke `localhost`)
- Teksten inneholder personvern- og GDPR-avsnittet, og caseeierens navn og e-post

### 4. Filer
1. Rediger case → «Materiale» → «+ Last opp fil». Last opp en liten bildefil (jpg/png) eller PDF.
2. **Forventet:** filen vises med størrelse og «X av 100.0 MB brukt».
3. Trykk «Last ned». **Forventet:** filen lastes ned og kan åpnes (presigned S3-URL).
4. Åpne selve case-siden (ikke rediger): Materiale vises der, kun med «Last ned» (ingen administrasjon).

### 5. Eksport
1. På case-siden: «Eksporter».
2. **Forventet:** en `.zip` lastes ned med et tekstsammendrag og den opplastede filen.

### 6. (Valgfritt) Godkjenn som kunde
1. Åpne lenken fra e-posten i et privat vindu, fyll ut navn/e-post, velg minst ett valg, send.
2. **Forventet:** kvitteringsside; bekreftelses-e-post til godkjenner og kopi til caseeier; case-siden viser «Innsendt og låst». Klokkeslett i e-posten skal være norsk lokaltid.
3. Er lenken brukt, skal den gi «Denne lenken er ikke lenger aktiv» ved nytt forsøk.

### 7. Slett test-casen
1. Rediger case → «Farlig sone» → «Slett case».
2. **Forventet:** dialogen advarer om permanent sletting og lister tilknyttede filer; etter «Ja, slett permanent» sendes du til biblioteket.
3. Åpne den gamle case-URL-en. **Forventet:** 404.
4. Casen skal ikke lenger finnes i biblioteket.

## Kjente begrensninger
- Sletting fjerner S3-objektene via `Promise.allSettled`; feiler S3 stille, kan objekter bli liggende i bucketen (ikke synlig i appen). Sjekk bucketen ved mistanke.
- Eierbytte for en ikke-admin-eier er ikke dekket (krever en annen brukerkonto).
