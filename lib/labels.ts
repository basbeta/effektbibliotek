import type {
  CaseLifecycleStatus,
  UsageApprovalStatus,
  Industry,
  CaseType,
  Channel,
  EffectType,
  EvidenceLevel,
  CaseLinkType,
} from "@/app/generated/prisma/client";

export const lifecycleStatusLabels: Record<CaseLifecycleStatus, string> = {
  started: "Påbegynt",
  ongoing: "Pågår",
  completed: "Ferdigstilt",
};

export const usageApprovalStatusLabels: Record<UsageApprovalStatus, string> = {
  not_requested: "Ikke sendt",
  open: "Åpen",
  submitted_locked: "Innsendt og låst",
};

export const industryLabels: Record<Industry, string> = {
  retail: "Retail",
  bank_finance: "Bank / finans",
  insurance: "Forsikring",
  telecom: "Telekom",
  energy: "Energi",
  public_sector: "Offentlig",
  health: "Helse",
  travel: "Reiseliv",
  b2b: "B2B",
  other: "Annet",
};

export const caseTypeLabels: Record<CaseType, string> = {
  sales_conversion: "Salg / konvertering",
  customer_journey: "Kundereise",
  automation: "Automatisering",
  loyalty: "Lojalitet",
  lead_generation: "Leadgenerering",
  winback: "Winback",
  onboarding: "Onboarding",
  notification: "Varsling",
  document_distribution: "Dokumentutsendelse",
  customer_insight: "Kundeinnsikt",
  concept_pilot: "Konsept / pilot",
  cost_reduction: "Kostnadsreduksjon",
  antichurn: "Antichurn",
  other: "Annet",
};

export const channelLabels: Record<Channel, string> = {
  sms: "SMS",
  rcs: "RCS",
  email: "E-post",
  push: "Push",
  web: "Web",
  landing_page: "Landingsside",
  chatbot: "Chatbot",
  api: "API",
  paid_media: "Paid media",
  post_letter: "Post / brev",
  digipost: "Digipost",
  physical_store: "Fysisk / butikk",
  multi_channel: "Flere kanaler",
  other: "Annet",
};

export const effectTypeLabels: Record<EffectType, string> = {
  increased_sales: "Økt salg",
  increased_conversion: "Økt konvertering",
  reduced_cost: "Redusert kostnad",
  increased_response: "Økt respons",
  increased_traffic: "Økt trafikk",
  better_customer_experience: "Bedre kundeopplevelse",
  time_saved: "Tidsbesparelse",
  higher_delivery_rate: "Økt leveringsgrad",
  documented_receipt: "Dokumentert mottak",
  reduced_manual_work: "Redusert manuelt arbeid",
  documented_learning: "Dokumentert læring",
  qualitative_effect: "Kvalitativ effekt",
};

export const evidenceLevelLabels: Record<EvidenceLevel, string> = {
  documented: "Dokumentert",
  estimated: "Estimert",
  qualitative: "Kvalitativ",
  not_measured: "Ikke målt",
};

export const caseLinkTypeLabels: Record<CaseLinkType, string> = {
  presentation: "Presentasjon",
  report: "Rapport",
  dashboard: "Dashboard",
  figma: "Figma",
  campaign: "Kampanje",
  website: "Nettside",
  documentation: "Dokumentasjon",
  other: "Annet",
};
