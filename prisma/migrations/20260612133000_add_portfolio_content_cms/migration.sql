-- CreateTable
CREATE TABLE "PortfolioContent" (
    "id" TEXT NOT NULL,
    "landingpageId" TEXT NOT NULL,
    "hero" JSONB,
    "about" JSONB,
    "services" JSONB,
    "process" JSONB,
    "contact" JSONB,
    "projects" JSONB,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioContent_landingpageId_key" ON "PortfolioContent"("landingpageId");

-- AddForeignKey
ALTER TABLE "PortfolioContent" ADD CONSTRAINT "PortfolioContent_landingpageId_fkey" FOREIGN KEY ("landingpageId") REFERENCES "LandingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
