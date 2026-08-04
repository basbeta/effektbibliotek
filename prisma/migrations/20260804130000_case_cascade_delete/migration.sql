-- DropForeignKey
ALTER TABLE "UsageApproval" DROP CONSTRAINT "UsageApproval_caseId_fkey";

-- DropForeignKey
ALTER TABLE "CaseLink" DROP CONSTRAINT "CaseLink_caseId_fkey";

-- AddForeignKey
ALTER TABLE "UsageApproval" ADD CONSTRAINT "UsageApproval_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseLink" ADD CONSTRAINT "CaseLink_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

