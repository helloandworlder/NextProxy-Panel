-- AlterTable
ALTER TABLE "nodes" ADD COLUMN     "ingress_config" JSONB,
ADD COLUMN     "node_type" VARCHAR(20) NOT NULL DEFAULT 'standard';

-- CreateTable
CREATE TABLE "dns_providers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "root_domain" VARCHAR(255) NOT NULL,
    "zone_id" VARCHAR(100),
    "credentials" JSONB NOT NULL,
    "domain_pattern" VARCHAR(255) NOT NULL DEFAULT '{prefix}-{tag}.{root}',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "enable" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dns_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dns_records" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "node_id" UUID,
    "record_type" VARCHAR(10) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "content" VARCHAR(255) NOT NULL,
    "proxied" BOOLEAN NOT NULL DEFAULT false,
    "ttl" INTEGER NOT NULL DEFAULT 300,
    "external_id" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dns_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gosea_socks5_pool" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "ip" VARCHAR(50) NOT NULL,
    "port" INTEGER NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "country_code" VARCHAR(10) NOT NULL,
    "city_code" VARCHAR(50),
    "isp_type" VARCHAR(20),
    "status" VARCHAR(20) NOT NULL DEFAULT 'available',
    "max_allocations" INTEGER NOT NULL DEFAULT 1,
    "current_allocations" INTEGER NOT NULL DEFAULT 0,
    "cost_per_day" DECIMAL(10,4),
    "expires_at" TIMESTAMP(3),
    "source" VARCHAR(50),
    "source_proxy_id" VARCHAR(100),
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gosea_socks5_pool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gosea_socks5_allocations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "pool_id" UUID NOT NULL,
    "external_order_id" VARCHAR(100),
    "external_user_id" VARCHAR(100),
    "allocated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',

    CONSTRAINT "gosea_socks5_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gosea_relay_endpoints" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "node_id" UUID NOT NULL,
    "inbound_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "outbound_id" UUID NOT NULL,
    "allocation_id" UUID,
    "domain_name" VARCHAR(255),
    "dns_record_id" UUID,
    "external_order_id" VARCHAR(100),
    "external_user_id" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gosea_relay_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dns_providers_tenant_id_idx" ON "dns_providers"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "dns_providers_tenant_id_root_domain_key" ON "dns_providers"("tenant_id", "root_domain");

-- CreateIndex
CREATE INDEX "dns_records_tenant_id_idx" ON "dns_records"("tenant_id");

-- CreateIndex
CREATE INDEX "dns_records_node_id_idx" ON "dns_records"("node_id");

-- CreateIndex
CREATE INDEX "dns_records_status_idx" ON "dns_records"("status");

-- CreateIndex
CREATE UNIQUE INDEX "dns_records_provider_id_name_key" ON "dns_records"("provider_id", "name");

-- CreateIndex
CREATE INDEX "gosea_socks5_pool_tenant_id_status_idx" ON "gosea_socks5_pool"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "gosea_socks5_pool_country_code_status_idx" ON "gosea_socks5_pool"("country_code", "status");

-- CreateIndex
CREATE INDEX "gosea_socks5_allocations_tenant_id_status_idx" ON "gosea_socks5_allocations"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "gosea_socks5_allocations_external_order_id_idx" ON "gosea_socks5_allocations"("external_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "gosea_relay_endpoints_allocation_id_key" ON "gosea_relay_endpoints"("allocation_id");

-- CreateIndex
CREATE INDEX "gosea_relay_endpoints_tenant_id_status_idx" ON "gosea_relay_endpoints"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "gosea_relay_endpoints_node_id_idx" ON "gosea_relay_endpoints"("node_id");

-- CreateIndex
CREATE INDEX "nodes_node_type_idx" ON "nodes"("node_type");

-- AddForeignKey
ALTER TABLE "dns_providers" ADD CONSTRAINT "dns_providers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dns_records" ADD CONSTRAINT "dns_records_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "dns_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dns_records" ADD CONSTRAINT "dns_records_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gosea_socks5_allocations" ADD CONSTRAINT "gosea_socks5_allocations_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "gosea_socks5_pool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gosea_relay_endpoints" ADD CONSTRAINT "gosea_relay_endpoints_allocation_id_fkey" FOREIGN KEY ("allocation_id") REFERENCES "gosea_socks5_allocations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
