-- CreateTable
CREATE TABLE "CaseFile" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByEmail" TEXT NOT NULL,

    CONSTRAINT "CaseFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CaseFile_storageKey_key" ON "CaseFile"("storageKey");

-- CreateIndex
CREATE INDEX "CaseFile_caseId_idx" ON "CaseFile"("caseId");

-- AddForeignKey
ALTER TABLE "CaseFile" ADD CONSTRAINT "CaseFile_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
