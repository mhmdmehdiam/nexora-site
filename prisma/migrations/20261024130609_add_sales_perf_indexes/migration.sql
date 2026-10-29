-- CreateIndex
CREATE INDEX "Sale_businessId_status_saleDate_idx" ON "Sale"("businessId", "status", "saleDate");

-- CreateIndex
CREATE INDEX "Sale_businessId_saleDate_idx" ON "Sale"("businessId", "saleDate");
