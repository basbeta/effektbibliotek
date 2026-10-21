# Manuell smoke-test (produksjon)

> Dekker det de automatiserte testene (`npm test`, CR-032) ikke kan: ekte database, S3, SMTP og UI.
> Kjør etter avhengighetsoppgraderinger, Prisma-/migreringsendringer og endringer i e-post, filhåndtering eller innlogging.
> Første gang kjørt 2026-10-20 etter CR-031.

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
