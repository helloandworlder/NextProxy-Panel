-- AlterTable
ALTER TABLE "inbounds" ADD COLUMN     "grpc_service_name" VARCHAR(100),
ADD COLUMN     "h2_path" VARCHAR(255),
ADD COLUMN     "protocol_settings" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "reality_dest" VARCHAR(255),
ADD COLUMN     "reality_private_key" VARCHAR(100),
ADD COLUMN     "reality_server_names" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "reality_short_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "security_type" VARCHAR(20) DEFAULT 'none',
ADD COLUMN     "sniffing_dest_override" TEXT[] DEFAULT ARRAY['http', 'tls']::TEXT[],
ADD COLUMN     "sniffing_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sniffing_route_only" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tls_cert_path" VARCHAR(500),
ADD COLUMN     "tls_key_path" VARCHAR(500),
ADD COLUMN     "tls_server_name" VARCHAR(255),
ADD COLUMN     "transport_type" VARCHAR(20) NOT NULL DEFAULT 'tcp',
ADD COLUMN     "ws_host" VARCHAR(255),
ADD COLUMN     "ws_path" VARCHAR(255);

-- AlterTable
ALTER TABLE "outbounds" ADD COLUMN     "grpc_service_name" VARCHAR(100),
ADD COLUMN     "protocol_settings" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "security_type" VARCHAR(20) DEFAULT 'none',
ADD COLUMN     "tls_fingerprint" VARCHAR(50),
ADD COLUMN     "tls_server_name" VARCHAR(255),
ADD COLUMN     "transport_type" VARCHAR(20) NOT NULL DEFAULT 'tcp',
ADD COLUMN     "ws_path" VARCHAR(255);

-- CreateTable
CREATE TABLE "system_admins" (
    "id" UUID NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "email" VARCHAR(100),
    "permissions" JSONB NOT NULL DEFAULT '["*"]',
    "enable" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "last_login_ip" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_admins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_admins_username_key" ON "system_admins"("username");

-- CreateIndex
CREATE INDEX "inbounds_security_type_idx" ON "inbounds"("security_type");

-- CreateIndex
CREATE INDEX "inbounds_transport_type_idx" ON "inbounds"("transport_type");

-- CreateIndex
CREATE INDEX "outbounds_security_type_idx" ON "outbounds"("security_type");

-- CreateIndex
CREATE INDEX "outbounds_transport_type_idx" ON "outbounds"("transport_type");
