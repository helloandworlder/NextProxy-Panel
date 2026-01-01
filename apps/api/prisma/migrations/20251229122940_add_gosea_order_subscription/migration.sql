-- AlterTable
ALTER TABLE "gosea_relay_endpoints" ADD COLUMN     "order_id" UUID;

-- AlterTable
ALTER TABLE "gosea_socks5_allocations" ADD COLUMN     "order_id" UUID;

-- AlterTable
ALTER TABLE "gosea_socks5_pool" ADD COLUMN     "city_name" VARCHAR(100),
ADD COLUMN     "continent_code" VARCHAR(5),
ADD COLUMN     "continent_name" VARCHAR(50),
ADD COLUMN     "country_name" VARCHAR(100);

-- CreateTable
CREATE TABLE "gosea_orders" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "order_no" VARCHAR(50) NOT NULL,
    "external_order_no" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "type" VARCHAR(20) NOT NULL DEFAULT 'purchase',
    "country_code" VARCHAR(10) NOT NULL,
    "city_code" VARCHAR(50),
    "quantity" INTEGER NOT NULL,
    "days" INTEGER NOT NULL,
    "total_price" DECIMAL(10,2),
    "currency" VARCHAR(10),
    "protocol" VARCHAR(20) NOT NULL DEFAULT 'vless',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "gosea_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gosea_subscriptions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "external_user_id" VARCHAR(100) NOT NULL,
    "relay_ids" TEXT[],
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gosea_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gosea_orders_order_no_key" ON "gosea_orders"("order_no");

-- CreateIndex
CREATE INDEX "gosea_orders_tenant_id_idx" ON "gosea_orders"("tenant_id");

-- CreateIndex
CREATE INDEX "gosea_orders_status_idx" ON "gosea_orders"("status");

-- CreateIndex
CREATE INDEX "gosea_orders_external_order_no_idx" ON "gosea_orders"("external_order_no");

-- CreateIndex
CREATE UNIQUE INDEX "gosea_subscriptions_token_key" ON "gosea_subscriptions"("token");

-- CreateIndex
CREATE INDEX "gosea_subscriptions_tenant_id_idx" ON "gosea_subscriptions"("tenant_id");

-- CreateIndex
CREATE INDEX "gosea_subscriptions_external_user_id_idx" ON "gosea_subscriptions"("external_user_id");

-- CreateIndex
CREATE INDEX "gosea_relay_endpoints_order_id_idx" ON "gosea_relay_endpoints"("order_id");

-- CreateIndex
CREATE INDEX "gosea_socks5_allocations_order_id_idx" ON "gosea_socks5_allocations"("order_id");

-- CreateIndex
CREATE INDEX "gosea_socks5_pool_continent_code_idx" ON "gosea_socks5_pool"("continent_code");

-- AddForeignKey
ALTER TABLE "gosea_socks5_allocations" ADD CONSTRAINT "gosea_socks5_allocations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "gosea_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gosea_relay_endpoints" ADD CONSTRAINT "gosea_relay_endpoints_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "gosea_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
