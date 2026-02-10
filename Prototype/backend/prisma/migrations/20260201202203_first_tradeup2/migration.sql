-- CreateEnum
CREATE TYPE "PresetType" AS ENUM ('STEADY_CLIMB', 'FLASH_CRASH', 'IMF_ROLLERCOASTER', 'REALISTIC_OUTLOOK');

-- CreateTable
CREATE TABLE "SimulationScenario" (
    "id" TEXT NOT NULL,
    "presetType" "PresetType" NOT NULL,
    "stockSymbol" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "trajectoryJson" JSONB NOT NULL,
    "newsJson" JSONB NOT NULL,
    "basePrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SimulationScenario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SimulationScenario_presetType_stockSymbol_idx" ON "SimulationScenario"("presetType", "stockSymbol");

-- CreateIndex
CREATE INDEX "SimulationScenario_expiresAt_idx" ON "SimulationScenario"("expiresAt");
