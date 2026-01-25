-- CreateEnum
CREATE TYPE "MarketScenario" AS ENUM ('CRASH', 'BULL', 'STAGNANT');

-- CreateTable
CREATE TABLE "Simulation" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "stockSymbol" TEXT NOT NULL,
    "scenarioType" "MarketScenario" NOT NULL,
    "predictedPrices" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Simulation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Simulation" ADD CONSTRAINT "Simulation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
