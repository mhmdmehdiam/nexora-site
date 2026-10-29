-- CreateTable
CREATE TABLE "InvoiceCounter" (
    "businessId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvoiceCounter_pkey" PRIMARY KEY ("businessId","year")
);
