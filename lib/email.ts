import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_LOGIN,
    pass: process.env.BREVO_SMTP_KEY,
  },
});

const FROM = process.env.FROM_EMAIL ?? "Effektbibliotek <effektbibliotek@basbeta.no>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: "Engangskode til Effektbiblioteket",
    text: `Hei,

Her er engangskoden din til Effektbiblioteket:

${otp}

Koden er gyldig i 5 minutter.

Hvis du ikke ba om denne koden, kan du se bort fra denne e-posten.`,
  });
}

export async function sendUsageApprovalConfirmation(params: {
  to: string;
  customerName: string;
  caseTitle: string;
  ownerName: string;
  choices: string[];
  note: string | null;
  submitterName: string;
  submitterEmail: string;
  submitterRole: string | null;
  submittedAt: Date;
}): Promise<void> {
  const choiceList = params.choices.map((c) => `- ${c}`).join("\n");
  const timestamp = params.submittedAt.toLocaleString("nb-NO", {
    dateStyle: "long",
    timeStyle: "short",
  });

  await transporter.sendMail({
    from: FROM,
    to: params.to,
    subject: "Bekreftelse på bruksgodkjenning for Bas effektbibliotek",
    text: `Hei,

Takk. Vi har registrert følgende bruksgodkjenning for casen:

Kunde: ${params.customerName}
Case: ${params.caseTitle}
Bas-kontakt: ${params.ownerName}

Valg:
${choiceList}
${params.note ? `\nKommentar:\n${params.note}\n` : ""}
Sendt inn av:
${params.submitterName}
${params.submitterEmail}
${params.submitterRole ? params.submitterRole + "\n" : ""}
Tidspunkt:
${timestamp}

Kopi er sendt til ansvarlig i Bas.

Effektbiblioteket er foreløpig i betatesting. Gi gjerne beskjed til kontaktpersonen din i Bas hvis noe er uklart, feil eller burde fungere annerledes.`,
  });
}

export async function sendUsageApprovalCopyToBas(params: {
  ownerEmail: string;
  customerName: string;
  caseTitle: string;
  caseId: string;
  choices: string[];
  note: string | null;
  submitterName: string;
  submitterEmail: string;
  submitterRole: string | null;
  submittedAt: Date;
}): Promise<void> {
  const choiceList = params.choices.map((c) => `- ${c}`).join("\n");
  const timestamp = params.submittedAt.toLocaleString("nb-NO", {
    dateStyle: "long",
    timeStyle: "short",
  });

  await transporter.sendMail({
    from: FROM,
    to: params.ownerEmail,
    subject: `Ny bruksgodkjenning mottatt: ${params.customerName} – ${params.caseTitle}`,
    text: `Hei,

Det er sendt inn en ny bruksgodkjenning for en case du eier i Effektbiblioteket.

Kunde: ${params.customerName}
Case: ${params.caseTitle}

Valg:
${choiceList}
${params.note ? `\nKommentar:\n${params.note}\n` : ""}
Sendt inn av:
${params.submitterName}
${params.submitterEmail}
${params.submitterRole ? params.submitterRole + "\n" : ""}
Tidspunkt:
${timestamp}

Se casen her:
${APP_URL}/case/${params.caseId}`,
  });
}
