/*
  Warnings:

  - You are about to drop the column `jobLevel` on the `Employee` table. All the data in the column will be lost.
  - Added the required column `jobLevelId` to the `Employee` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "jobLevel",
ADD COLUMN     "jobLevelId" TEXT NOT NULL,
ADD COLUMN     "title" TEXT;

-- CreateTable
CREATE TABLE "JobLevel" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "JobLevel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobLevel_code_key" ON "JobLevel"("code");

-- CreateIndex
CREATE UNIQUE INDEX "JobLevel_rank_key" ON "JobLevel"("rank");

-- CreateIndex
CREATE INDEX "Employee_jobLevelId_idx" ON "Employee"("jobLevelId");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_jobLevelId_fkey" FOREIGN KEY ("jobLevelId") REFERENCES "JobLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
