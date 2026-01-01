/*
  Warnings:

  - You are about to drop the column `alter_id` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the column `outbound_id` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the column `security` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the column `allocate` on the `inbounds` table. All the data in the column will be lost.
  - You are about to drop the column `grpc_service_name` on the `inbounds` table. All the data in the column will be lost.
  - You are about to drop the column `h2_path` on the `inbounds` table. All the data in the column will be lost.
  - You are about to drop the column `protocol_settings` on the `inbounds` table. All the data in the column will be lost.
  - You are about to drop the column `reality_dest` on the `inbounds` table. All the data in the column will be lost.
  - You are about to drop the column `reality_private_key` on the `inbounds` table. All the data in the column will be lost.
  - You are about to drop the column `reality_server_names` on the `inbounds` table. All the data in the column will be lost.
  - You are about to drop the column `reality_short_ids` on the `inbounds` table. All the data in the column will be lost.
  - You are about to drop the column `security_type` on the `inbounds` table. All the data in the column will be lost.
  - You are about to drop the column `sniffing_dest_override` on the `inbounds` table. All the data in the column will be lost.
  - You are about to drop the column `sniffing_enabled` on the `inbounds` table. All the data in the column will be lost.
  - You are about to drop the column `sniffing_route_only` on the `inbounds` table. All the data in the column will be lost.
  - You are about to drop the column `tls_cert_path` on the `inbounds` table. All the data in the column will be lost.
  - You are about to drop the column `tls_key_path` on the `inbounds` table. All the data in the column will be lost.
  - You are about to drop the column `tls_server_name` on the `inbounds` table. All the data in the column will be lost.
  - You are about to drop the column `transport_type` on the `inbounds` table. All the data in the column will be lost.
  - You are about to drop the column `ws_host` on the `inbounds` table. All the data in the column will be lost.
  - You are about to drop the column `ws_path` on the `inbounds` table. All the data in the column will be lost.
  - You are about to drop the column `grpc_service_name` on the `outbounds` table. All the data in the column will be lost.
  - You are about to drop the column `protocol_settings` on the `outbounds` table. All the data in the column will be lost.
  - You are about to drop the column `security_type` on the `outbounds` table. All the data in the column will be lost.
  - You are about to drop the column `tls_fingerprint` on the `outbounds` table. All the data in the column will be lost.
  - You are about to drop the column `tls_server_name` on the `outbounds` table. All the data in the column will be lost.
  - You are about to drop the column `transport_type` on the `outbounds` table. All the data in the column will be lost.
  - You are about to drop the column `ws_path` on the `outbounds` table. All the data in the column will be lost.
  - You are about to drop the `client_inbound_access` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `client_online_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `client_traffic` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tenant_users` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `stream_settings` on table `inbounds` required. This step will fail if there are existing NULL values in that column.
  - Made the column `sniffing` on table `inbounds` required. This step will fail if there are existing NULL values in that column.
  - Made the column `stream_settings` on table `outbounds` required. This step will fail if there are existing NULL values in that column.
  - Made the column `proxy_settings` on table `outbounds` required. This step will fail if there are existing NULL values in that column.
  - Made the column `mux_settings` on table `outbounds` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "client_inbound_access" DROP CONSTRAINT "client_inbound_access_client_id_fkey";

-- DropForeignKey
ALTER TABLE "client_inbound_access" DROP CONSTRAINT "client_inbound_access_inbound_id_fkey";

-- DropForeignKey
ALTER TABLE "client_online_logs" DROP CONSTRAINT "client_online_logs_client_id_fkey";

-- DropForeignKey
ALTER TABLE "client_online_logs" DROP CONSTRAINT "client_online_logs_node_id_fkey";

-- DropForeignKey
ALTER TABLE "client_traffic" DROP CONSTRAINT "client_traffic_client_id_fkey";

-- DropForeignKey
ALTER TABLE "client_traffic" DROP CONSTRAINT "client_traffic_inbound_id_fkey";

-- DropForeignKey
ALTER TABLE "client_traffic" DROP CONSTRAINT "client_traffic_node_id_fkey";

-- DropForeignKey
ALTER TABLE "clients" DROP CONSTRAINT "clients_outbound_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_users" DROP CONSTRAINT "tenant_users_tenant_id_fkey";

-- DropIndex
DROP INDEX "inbounds_security_type_idx";

-- DropIndex
DROP INDEX "inbounds_transport_type_idx";

-- DropIndex
DROP INDEX "outbounds_security_type_idx";

-- DropIndex
DROP INDEX "outbounds_transport_type_idx";

-- AlterTable
ALTER TABLE "balancers" ALTER COLUMN "balancer_config" SET DEFAULT '{"selector":[],"strategy":{"type":"random"}}',
ALTER COLUMN "balancer_config" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "clients" DROP COLUMN "alter_id",
DROP COLUMN "outbound_id",
DROP COLUMN "security",
ADD COLUMN     "comment" VARCHAR(500),
ADD COLUMN     "delayed_start" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "first_connect_at" TIMESTAMP(3),
ADD COLUMN     "inbound_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "limit_ip" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "outbound_tag" VARCHAR(100),
ADD COLUMN     "reset" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tg_id" VARCHAR(50);

-- AlterTable
ALTER TABLE "dns_configs" ALTER COLUMN "dns_config" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "inbounds" DROP COLUMN "allocate",
DROP COLUMN "grpc_service_name",
DROP COLUMN "h2_path",
DROP COLUMN "protocol_settings",
DROP COLUMN "reality_dest",
DROP COLUMN "reality_private_key",
DROP COLUMN "reality_server_names",
DROP COLUMN "reality_short_ids",
DROP COLUMN "security_type",
DROP COLUMN "sniffing_dest_override",
DROP COLUMN "sniffing_enabled",
DROP COLUMN "sniffing_route_only",
DROP COLUMN "tls_cert_path",
DROP COLUMN "tls_key_path",
DROP COLUMN "tls_server_name",
DROP COLUMN "transport_type",
DROP COLUMN "ws_host",
DROP COLUMN "ws_path",
ALTER COLUMN "settings" SET DATA TYPE TEXT,
ALTER COLUMN "stream_settings" SET NOT NULL,
ALTER COLUMN "stream_settings" SET DEFAULT '{}',
ALTER COLUMN "stream_settings" SET DATA TYPE TEXT,
ALTER COLUMN "sniffing" SET NOT NULL,
ALTER COLUMN "sniffing" SET DEFAULT '{"enabled":true,"destOverride":["http","tls"]}',
ALTER COLUMN "sniffing" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "node_groups" ADD COLUMN     "group_type" VARCHAR(50) NOT NULL DEFAULT 'custom',
ADD COLUMN     "required_tags" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "schema_fields" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "nodes" ADD COLUMN     "group_meta" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "outbounds" DROP COLUMN "grpc_service_name",
DROP COLUMN "protocol_settings",
DROP COLUMN "security_type",
DROP COLUMN "tls_fingerprint",
DROP COLUMN "tls_server_name",
DROP COLUMN "transport_type",
DROP COLUMN "ws_path",
ALTER COLUMN "settings" SET DATA TYPE TEXT,
ALTER COLUMN "stream_settings" SET NOT NULL,
ALTER COLUMN "stream_settings" SET DEFAULT '{}',
ALTER COLUMN "stream_settings" SET DATA TYPE TEXT,
ALTER COLUMN "proxy_settings" SET NOT NULL,
ALTER COLUMN "proxy_settings" SET DEFAULT '{}',
ALTER COLUMN "proxy_settings" SET DATA TYPE TEXT,
ALTER COLUMN "mux_settings" SET NOT NULL,
ALTER COLUMN "mux_settings" SET DEFAULT '{}',
ALTER COLUMN "mux_settings" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "policy_configs" ALTER COLUMN "policy_config" SET DEFAULT '{"levels":{"0":{"statsUserUplink":true,"statsUserDownlink":true}},"system":{"statsInboundUplink":true,"statsInboundDownlink":true}}',
ALTER COLUMN "policy_config" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "routing_rules" ALTER COLUMN "rule_config" SET DATA TYPE TEXT;

-- DropTable
DROP TABLE "client_inbound_access";

-- DropTable
DROP TABLE "client_online_logs";

-- DropTable
DROP TABLE "client_traffic";

-- DropTable
DROP TABLE "tenant_users";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100),
    "password_hash" VARCHAR(255) NOT NULL,
    "enable" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "last_login_ip" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_memberships" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'operator',
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_stats" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "node_id" UUID NOT NULL,
    "inbound_id" UUID NOT NULL,
    "up" BIGINT NOT NULL DEFAULT 0,
    "down" BIGINT NOT NULL DEFAULT 0,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_ip_logs" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "ip" VARCHAR(50) NOT NULL,
    "inbound_tag" VARCHAR(100),
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_ip_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_settings" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sub_enable" BOOLEAN NOT NULL DEFAULT false,
    "sub_domain" VARCHAR(255),
    "sub_port" INTEGER,
    "sub_path" VARCHAR(100) NOT NULL DEFAULT '/sub/',
    "sub_encrypt" BOOLEAN NOT NULL DEFAULT false,
    "sub_show_info" BOOLEAN NOT NULL DEFAULT true,
    "sub_title" VARCHAR(255),
    "sub_updates" INTEGER NOT NULL DEFAULT 12,
    "sub_json_enable" BOOLEAN NOT NULL DEFAULT false,
    "sub_json_path" VARCHAR(100) NOT NULL DEFAULT '/json/',
    "tg_bot_enable" BOOLEAN NOT NULL DEFAULT false,
    "tg_bot_token" VARCHAR(255),
    "tg_bot_chat_id" VARCHAR(100),
    "tg_bot_proxy" VARCHAR(255),
    "tg_notify_login" BOOLEAN NOT NULL DEFAULT false,
    "tg_notify_backup" BOOLEAN NOT NULL DEFAULT false,
    "tg_notify_cpu" INTEGER NOT NULL DEFAULT 0,
    "tg_notify_expire" BOOLEAN NOT NULL DEFAULT true,
    "tg_notify_traffic" BOOLEAN NOT NULL DEFAULT true,
    "ip_limit_enable" BOOLEAN NOT NULL DEFAULT true,
    "two_factor_enable" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_token" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_versions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "node_id" UUID NOT NULL,
    "version" SERIAL NOT NULL,
    "config_json" TEXT NOT NULL,
    "etag" VARCHAR(64) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "error_msg" TEXT,
    "change_type" VARCHAR(20) NOT NULL DEFAULT 'update',
    "changed_by" UUID,
    "change_reason" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_at" TIMESTAMP(3),

    CONSTRAINT "config_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "tenant_memberships_user_id_idx" ON "tenant_memberships"("user_id");

-- CreateIndex
CREATE INDEX "tenant_memberships_tenant_id_idx" ON "tenant_memberships"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_memberships_user_id_tenant_id_key" ON "tenant_memberships"("user_id", "tenant_id");

-- CreateIndex
CREATE INDEX "client_stats_node_id_idx" ON "client_stats"("node_id");

-- CreateIndex
CREATE INDEX "client_stats_client_id_idx" ON "client_stats"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_stats_client_id_node_id_inbound_id_key" ON "client_stats"("client_id", "node_id", "inbound_id");

-- CreateIndex
CREATE INDEX "client_ip_logs_client_id_idx" ON "client_ip_logs"("client_id");

-- CreateIndex
CREATE INDEX "client_ip_logs_last_seen_at_idx" ON "client_ip_logs"("last_seen_at");

-- CreateIndex
CREATE UNIQUE INDEX "client_ip_logs_client_id_ip_key" ON "client_ip_logs"("client_id", "ip");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_settings_tenant_id_key" ON "tenant_settings"("tenant_id");

-- CreateIndex
CREATE INDEX "config_versions_node_id_version_idx" ON "config_versions"("node_id", "version");

-- CreateIndex
CREATE INDEX "config_versions_node_id_status_idx" ON "config_versions"("node_id", "status");

-- CreateIndex
CREATE INDEX "config_versions_tenant_id_idx" ON "config_versions"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE INDEX "node_groups_group_type_idx" ON "node_groups"("group_type");

-- AddForeignKey
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_stats" ADD CONSTRAINT "client_stats_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_stats" ADD CONSTRAINT "client_stats_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_stats" ADD CONSTRAINT "client_stats_inbound_id_fkey" FOREIGN KEY ("inbound_id") REFERENCES "inbounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_ip_logs" ADD CONSTRAINT "client_ip_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
