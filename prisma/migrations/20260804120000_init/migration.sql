-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CaseLifecycleStatus" AS ENUM ('started', 'ongoing', 'completed');

-- CreateEnum
CREATE TYPE "UsageApprovalStatus" AS ENUM ('not_requested', 'open', 'submitted_locked');

-- CreateEnum
CREATE TYPE "Industry" AS ENUM ('retail', 'bank_finance', 'insurance', 'telecom', 'energy', 'public_sector', 'health', 'travel', 'b2b', 'other');

-- CreateEnum
CREATE TYPE "CaseType" AS ENUM ('sales_conversion', 'customer_journey', 'automation', 'loyalty', 'lead_generation', 'winback', 'onboarding', 'notification', 'document_distribution', 'customer_insight', 'concept_pilot', 'cost_reduction', 'antichurn', 'other');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('sms', 'rcs', 'email', 'push', 'web', 'landing_page', 'chatbot', 'api', 'paid_media', 'post_letter', 'digipost', 'physical_store', 'multi_channel', 'other');

-- CreateEnum
CREATE TYPE "EffectType" AS ENUM ('increased_sales', 'increased_conversion', 'reduced_cost', 'increased_response', 'increased_traffic', 'better_customer_experience', 'time_saved', 'higher_delivery_rate', 'documented_receipt', 'reduced_manual_work', 'documented_learning', 'qualitative_effect');

-- CreateEnum
CREATE TYPE "EvidenceLevel" AS ENUM ('documented', 'estimated', 'qualitative', 'not_measured');

-- CreateEnum
CREATE TYPE "CaseLinkType" AS ENUM ('presentation', 'report', 'dashboard', 'figma', 'campaign', 'website', 'documentation', 'other');

-- CreateTable
CREATE TABLE "User" (
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "customerFacingSummary" TEXT,
    "lifecycleStatus" "CaseLifecycleStatus" NOT NULL DEFAULT 'started',
    "industry" "Industry",
    "caseTypes" "CaseType"[],
    "channels" "Channel"[],
    "effectTypes" "EffectType"[],
    "tags" TEXT[],
    "problem" TEXT,
    "solution" TEXT,
    "resultSummary" TEXT,
    "learning" TEXT,
    "relevance" TEXT,
    "pitchText" TEXT,
    "internalNotes" TEXT,
    "effectMetric" TEXT,
    "beforeValue" TEXT,
    "afterValue" TEXT,
    "resultValue" TEXT,
    "measurementPeriod" TEXT,
    "dataSource" TEXT,
    "evidenceLevel" "EvidenceLevel",
    "usageApprovalStatus" "UsageApprovalStatus" NOT NULL DEFAULT 'not_requested',
    "usageApprovalToken" TEXT,
    "approverName" TEXT,
    "approverEmail" TEXT,
    "ndaRestricted" BOOLEAN NOT NULL DEFAULT false,
    "anonymizedUseOnly" BOOLEAN NOT NULL DEFAULT false,
    "websiteUseAllowed" BOOLEAN NOT NULL DEFAULT false,
    "presentationUseAllowed" BOOLEAN NOT NULL DEFAULT false,
    "tenderUseAllowed" BOOLEAN NOT NULL DEFAULT false,
    "competitionUseAllowed" BOOLEAN NOT NULL DEFAULT false,
    "ownerEmail" TEXT NOT NULL,
    "createdByEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByEmail" TEXT,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageApproval" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedByName" TEXT NOT NULL,
    "submittedByEmail" TEXT NOT NULL,
    "submittedByRole" TEXT,
    "ndaRestricted" BOOLEAN NOT NULL DEFAULT false,
    "anonymizedUseOnly" BOOLEAN NOT NULL DEFAULT false,
    "websiteUseAllowed" BOOLEAN NOT NULL DEFAULT false,
    "presentationUseAllowed" BOOLEAN NOT NULL DEFAULT false,
    "tenderUseAllowed" BOOLEAN NOT NULL DEFAULT false,
    "competitionUseAllowed" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmationEmailSentAt" TIMESTAMP(3),
    "copiedToBasEmail" TEXT,

    CONSTRAINT "UsageApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseLink" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "CaseLinkType",
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByEmail" TEXT NOT NULL,

    CONSTRAINT "CaseLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OtpCode_email_idx" ON "OtpCode"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Case_usageApprovalToken_key" ON "Case"("usageApprovalToken");

-- CreateIndex
CREATE INDEX "UsageApproval_caseId_idx" ON "UsageApproval"("caseId");

-- CreateIndex
CREATE INDEX "CaseLink_caseId_idx" ON "CaseLink"("caseId");

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_ownerEmail_fkey" FOREIGN KEY ("ownerEmail") REFERENCES "User"("email") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_createdByEmail_fkey" FOREIGN KEY ("createdByEmail") REFERENCES "User"("email") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageApproval" ADD CONSTRAINT "UsageApproval_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseLink" ADD CONSTRAINT "CaseLink_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

