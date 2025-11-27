-- CreateTable
CREATE TABLE "CollaborationNote" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mentions" JSONB,
    "authorId" TEXT,
    "authorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollaborationNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollaborationNote_clientId_idx" ON "CollaborationNote"("clientId");

-- AddForeignKey
ALTER TABLE "CollaborationNote" ADD CONSTRAINT "CollaborationNote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
