export interface ApprovalChoices {
  ndaRestricted: boolean;
  anonymizedUseOnly: boolean;
  websiteUseAllowed: boolean;
  presentationUseAllowed: boolean;
  tenderUseAllowed: boolean;
  competitionUseAllowed: boolean;
}

/**
 * NDA and "kun anonymisert" are exclusive: either one blocks every other
 * choice. Enforced here server-side too, independent of client behavior.
 */
export function sanitizeChoices(choices: ApprovalChoices): ApprovalChoices {
  if (choices.ndaRestricted) {
    return {
      ndaRestricted: true,
      anonymizedUseOnly: false,
      websiteUseAllowed: false,
      presentationUseAllowed: false,
      tenderUseAllowed: false,
      competitionUseAllowed: false,
    };
  }
  if (choices.anonymizedUseOnly) {
    return {
      ndaRestricted: false,
      anonymizedUseOnly: true,
      websiteUseAllowed: false,
      presentationUseAllowed: false,
      tenderUseAllowed: false,
      competitionUseAllowed: false,
    };
  }
  return {
    ndaRestricted: false,
    anonymizedUseOnly: false,
    websiteUseAllowed: !!choices.websiteUseAllowed,
    presentationUseAllowed: !!choices.presentationUseAllowed,
    tenderUseAllowed: !!choices.tenderUseAllowed,
    competitionUseAllowed: !!choices.competitionUseAllowed,
  };
}

export function buildPrivacyNotice(ownerName: string, ownerEmail: string): string {
  return `Personvern: For å kunne dokumentere brukstillatelsene vil vi lagre navn og e-postadresse så lenge vi oppbevarer casen. Ønsker du å endre eller trekke tilbake tillatelsen, eller av andre grunner fjerne navn og epostadresse fra arkivene, ta kontakt med ${ownerName} på ${ownerEmail}.`;
}

export const GDPR_NOTICE =
  "GDPR: Bas Kommunikasjon sitt effektbibliotek og basbeta.no driftes utelukkende på europeisk og/eller selvhostet programvare med lagring i EU.";

export function buildApprovalText(params: {
  approverName?: string;
  ownerName: string;
  ownerEmail: string;
  caseTitle: string;
  caseId: string;
  token: string;
  appUrl: string;
}): string {
  const url = `${params.appUrl}/godkjenning/${params.caseId}/${params.token}`;
  const greeting = params.approverName ? `Hei ${params.approverName},` : "Hei,";
  return `${greeting}

${params.ownerName} har registrert casen «${params.caseTitle}» i vårt effektbibliotek. I Bas er vi opptatt av å dele og lære, og for å dokumentere hva vi har tillatelse til å bruke casene vi gjennomfører til, vil vi gjerne at du tar et minutt til å gi oss tilbakemelding på hva vi kan bruke denne casen til.

Du kan se hva vi ønsker å bruke og gi oss tilbakemelding her:
${url}

Det tar bare et minutt, og du velger selv hva vi kan bruke og i hvilken sammenheng.

Ta gjerne kontakt med ${params.ownerName} på ${params.ownerEmail} hvis du har spørsmål.

Med vennlig hilsen
QA-teamet
Bas Kommunikasjon

---
${buildPrivacyNotice(params.ownerName, params.ownerEmail)}

${GDPR_NOTICE}

Effektbiblioteket er foreløpig i betatesting. Gi gjerne beskjed til ${params.ownerName} hvis noe er uklart, feil eller burde fungere annerledes.`;
}

export const choiceLabels: Record<keyof ApprovalChoices, string> = {
  ndaRestricted: "Casen er NDA-belagt og skal ikke deles med andre",
  anonymizedUseOnly: "Casen kan kun brukes anonymisert",
  websiteUseAllowed: "Casen kan brukes som case på hjemmeside",
  presentationUseAllowed: "Casen kan brukes som case i presentasjoner",
  tenderUseAllowed: "Casen kan brukes som case i anbudsbesvarelser",
  competitionUseAllowed: "Casen kan brukes som case i konkurranse/award-show",
};
