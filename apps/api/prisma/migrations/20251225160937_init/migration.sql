-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "max_nodes" INTEGER NOT NULL DEFAULT 10,
    "max_clients" INTEGER NOT NULL DEFAULT 1000,
    "max_traffic_bytes" BIGINT NOT NULL DEFAULT 0,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_users" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "email" VARCHAR(100),
    "role" VARCHAR(20) NOT NULL DEFAULT 'operator',
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "enable" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "last_login_ip" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_api_keys" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "key_hash" VARCHAR(255) NOT NULL,
    "key_prefix" VARCHAR(10) NOT NULL,
    "scopes" JSONB NOT NULL DEFAULT '["*"]',
    "rate_limit" INTEGER NOT NULL DEFAULT 1000,
    "allowed_ips" JSONB NOT NULL DEFAULT '[]',
    "expires_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "node_groups" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "lb_strategy" VARCHAR(50) NOT NULL DEFAULT 'round_robin',
    "lb_settings" JSONB NOT NULL DEFAULT '{}',
    "health_check" JSONB NOT NULL DEFAULT '{}',
    "remark" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "node_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nodes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "node_group_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "public_ip" VARCHAR(50),
    "grpc_port" INTEGER NOT NULL DEFAULT 50051,
    "country_code" VARCHAR(10),
    "country_name" VARCHAR(100),
    "city" VARCHAR(100),
    "isp" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'offline',
    "last_seen_at" TIMESTAMP(3),
    "system_info" JSONB NOT NULL DEFAULT '{}',
    "runtime_stats" JSONB NOT NULL DEFAULT '{}',
    "config_overrides" JSONB NOT NULL DEFAULT '{}',
    "tags" JSONB NOT NULL DEFAULT '[]',
    "remark" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "egress_ips" (
    "id" UUID NOT NULL,
    "node_id" UUID NOT NULL,
    "ip" VARCHAR(50) NOT NULL,
    "ip_version" INTEGER NOT NULL DEFAULT 4,
    "interface_name" VARCHAR(50),
    "ip_type" VARCHAR(20) NOT NULL DEFAULT 'datacenter',
    "isp" VARCHAR(100),
    "asn" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "current_users" INTEGER NOT NULL DEFAULT 0,
    "max_users" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "last_checked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "egress_ips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbounds" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "node_id" UUID NOT NULL,
    "tag" VARCHAR(100) NOT NULL,
    "protocol" VARCHAR(50) NOT NULL,
    "port" INTEGER NOT NULL,
    "listen" VARCHAR(50) NOT NULL DEFAULT '0.0.0.0',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "stream_settings" JSONB,
    "sniffing" JSONB DEFAULT '{"enabled": true, "destOverride": ["http", "tls"]}',
    "allocate" JSONB,
    "enable" BOOLEAN NOT NULL DEFAULT true,
    "remark" VARCHAR(255),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inbounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbounds" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "node_id" UUID NOT NULL,
    "tag" VARCHAR(100) NOT NULL,
    "protocol" VARCHAR(50) NOT NULL,
    "send_through" VARCHAR(50),
    "egress_ip_id" UUID,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "stream_settings" JSONB,
    "proxy_settings" JSONB,
    "mux_settings" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "enable" BOOLEAN NOT NULL DEFAULT true,
    "remark" VARCHAR(255),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routing_rules" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "node_id" UUID NOT NULL,
    "rule_tag" VARCHAR(100) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "rule_config" JSONB NOT NULL DEFAULT '{}',
    "enable" BOOLEAN NOT NULL DEFAULT true,
    "remark" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balancers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "node_id" UUID NOT NULL,
    "tag" VARCHAR(100) NOT NULL,
    "balancer_config" JSONB NOT NULL DEFAULT '{"selector": [], "strategy": {"type": "random"}}',
    "enable" BOOLEAN NOT NULL DEFAULT true,
    "remark" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "balancers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dns_configs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "node_id" UUID NOT NULL,
    "dns_config" JSONB NOT NULL DEFAULT '{}',
    "enable" BOOLEAN NOT NULL DEFAULT true,
    "remark" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dns_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_configs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "node_id" UUID NOT NULL,
    "policy_config" JSONB NOT NULL DEFAULT '{"levels": {"0": {"statsUserUplink": true, "statsUserDownlink": true}}, "system": {"statsInboundUplink": true, "statsInboundDownlink": true}}',
    "enable" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policy_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "uuid" VARCHAR(36),
    "password" VARCHAR(255),
    "flow" VARCHAR(50),
    "alter_id" INTEGER NOT NULL DEFAULT 0,
    "security" VARCHAR(50) NOT NULL DEFAULT 'auto',
    "method" VARCHAR(50),
    "level" INTEGER NOT NULL DEFAULT 0,
    "total_bytes" BIGINT NOT NULL DEFAULT 0,
    "used_bytes" BIGINT NOT NULL DEFAULT 0,
    "expiry_time" BIGINT NOT NULL DEFAULT 0,
    "upload_limit" BIGINT NOT NULL DEFAULT 0,
    "download_limit" BIGINT NOT NULL DEFAULT 0,
    "device_limit" INTEGER NOT NULL DEFAULT 0,
    "outbound_id" UUID,
    "sub_id" VARCHAR(50),
    "remark" VARCHAR(255),
    "enable" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_inbound_access" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "inbound_id" UUID NOT NULL,
    "override_settings" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_inbound_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_traffic" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "node_id" UUID NOT NULL,
    "inbound_id" UUID,
    "upload" BIGINT NOT NULL DEFAULT 0,
    "download" BIGINT NOT NULL DEFAULT 0,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_traffic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_online_logs" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "node_id" UUID NOT NULL,
    "client_ip" VARCHAR(50) NOT NULL,
    "device_id" VARCHAR(100),
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnected_at" TIMESTAMP(3),

    CONSTRAINT "client_online_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "api_key_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "resource_type" VARCHAR(50),
    "resource_id" UUID,
    "changes" JSONB,
    "ip" VARCHAR(50),
    "user_agent" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_users_tenant_id_username_key" ON "tenant_users"("tenant_id", "username");

-- CreateIndex
CREATE INDEX "tenant_api_keys_key_prefix_idx" ON "tenant_api_keys"("key_prefix");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_api_keys_tenant_id_name_key" ON "tenant_api_keys"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "node_groups_tenant_id_name_key" ON "node_groups"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "nodes_token_key" ON "nodes"("token");

-- CreateIndex
CREATE INDEX "nodes_tenant_id_idx" ON "nodes"("tenant_id");

-- CreateIndex
CREATE INDEX "nodes_status_idx" ON "nodes"("status");

-- CreateIndex
CREATE INDEX "nodes_country_code_idx" ON "nodes"("country_code");

-- CreateIndex
CREATE UNIQUE INDEX "nodes_tenant_id_name_key" ON "nodes"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "egress_ips_node_id_idx" ON "egress_ips"("node_id");

-- CreateIndex
CREATE INDEX "egress_ips_ip_type_idx" ON "egress_ips"("ip_type");

-- CreateIndex
CREATE UNIQUE INDEX "egress_ips_node_id_ip_key" ON "egress_ips"("node_id", "ip");

-- CreateIndex
CREATE INDEX "inbounds_tenant_id_idx" ON "inbounds"("tenant_id");

-- CreateIndex
CREATE INDEX "inbounds_node_id_idx" ON "inbounds"("node_id");

-- CreateIndex
CREATE INDEX "inbounds_protocol_idx" ON "inbounds"("protocol");

-- CreateIndex
CREATE UNIQUE INDEX "inbounds_node_id_tag_key" ON "inbounds"("node_id", "tag");

-- CreateIndex
CREATE UNIQUE INDEX "inbounds_node_id_port_listen_key" ON "inbounds"("node_id", "port", "listen");

-- CreateIndex
CREATE INDEX "outbounds_tenant_id_idx" ON "outbounds"("tenant_id");

-- CreateIndex
CREATE INDEX "outbounds_node_id_idx" ON "outbounds"("node_id");

-- CreateIndex
CREATE INDEX "outbounds_protocol_idx" ON "outbounds"("protocol");

-- CreateIndex
CREATE UNIQUE INDEX "outbounds_node_id_tag_key" ON "outbounds"("node_id", "tag");

-- CreateIndex
CREATE INDEX "routing_rules_tenant_id_idx" ON "routing_rules"("tenant_id");

-- CreateIndex
CREATE INDEX "routing_rules_node_id_idx" ON "routing_rules"("node_id");

-- CreateIndex
CREATE INDEX "routing_rules_priority_idx" ON "routing_rules"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "routing_rules_node_id_rule_tag_key" ON "routing_rules"("node_id", "rule_tag");

-- CreateIndex
CREATE INDEX "balancers_node_id_idx" ON "balancers"("node_id");

-- CreateIndex
CREATE UNIQUE INDEX "balancers_node_id_tag_key" ON "balancers"("node_id", "tag");

-- CreateIndex
CREATE UNIQUE INDEX "dns_configs_node_id_key" ON "dns_configs"("node_id");

-- CreateIndex
CREATE UNIQUE INDEX "policy_configs_node_id_key" ON "policy_configs"("node_id");

-- CreateIndex
CREATE INDEX "clients_tenant_id_idx" ON "clients"("tenant_id");

-- CreateIndex
CREATE INDEX "clients_email_idx" ON "clients"("email");

-- CreateIndex
CREATE INDEX "clients_sub_id_idx" ON "clients"("sub_id");

-- CreateIndex
CREATE INDEX "clients_enable_idx" ON "clients"("enable");

-- CreateIndex
CREATE UNIQUE INDEX "clients_tenant_id_email_key" ON "clients"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "client_inbound_access_client_id_idx" ON "client_inbound_access"("client_id");

-- CreateIndex
CREATE INDEX "client_inbound_access_inbound_id_idx" ON "client_inbound_access"("inbound_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_inbound_access_client_id_inbound_id_key" ON "client_inbound_access"("client_id", "inbound_id");

-- CreateIndex
CREATE INDEX "client_traffic_client_id_idx" ON "client_traffic"("client_id");

-- CreateIndex
CREATE INDEX "client_traffic_node_id_idx" ON "client_traffic"("node_id");

-- CreateIndex
CREATE INDEX "client_traffic_recorded_at_idx" ON "client_traffic"("recorded_at");

-- CreateIndex
CREATE INDEX "client_online_logs_client_id_idx" ON "client_online_logs"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_online_active" ON "client_online_logs"("client_id", "disconnected_at");

-- CreateIndex
CREATE UNIQUE INDEX "client_online_logs_client_id_node_id_client_ip_key" ON "client_online_logs"("client_id", "node_id", "client_ip");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_resource_type_resource_id_idx" ON "audit_logs"("resource_type", "resource_id");

-- AddForeignKey
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_api_keys" ADD CONSTRAINT "tenant_api_keys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_groups" ADD CONSTRAINT "node_groups_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_node_group_id_fkey" FOREIGN KEY ("node_group_id") REFERENCES "node_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "egress_ips" ADD CONSTRAINT "egress_ips_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbounds" ADD CONSTRAINT "inbounds_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbounds" ADD CONSTRAINT "inbounds_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbounds" ADD CONSTRAINT "outbounds_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbounds" ADD CONSTRAINT "outbounds_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbounds" ADD CONSTRAINT "outbounds_egress_ip_id_fkey" FOREIGN KEY ("egress_ip_id") REFERENCES "egress_ips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_rules" ADD CONSTRAINT "routing_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_rules" ADD CONSTRAINT "routing_rules_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balancers" ADD CONSTRAINT "balancers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balancers" ADD CONSTRAINT "balancers_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dns_configs" ADD CONSTRAINT "dns_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dns_configs" ADD CONSTRAINT "dns_configs_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_configs" ADD CONSTRAINT "policy_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_configs" ADD CONSTRAINT "policy_configs_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_outbound_id_fkey" FOREIGN KEY ("outbound_id") REFERENCES "outbounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_inbound_access" ADD CONSTRAINT "client_inbound_access_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_inbound_access" ADD CONSTRAINT "client_inbound_access_inbound_id_fkey" FOREIGN KEY ("inbound_id") REFERENCES "inbounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_traffic" ADD CONSTRAINT "client_traffic_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_traffic" ADD CONSTRAINT "client_traffic_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_traffic" ADD CONSTRAINT "client_traffic_inbound_id_fkey" FOREIGN KEY ("inbound_id") REFERENCES "inbounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_online_logs" ADD CONSTRAINT "client_online_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_online_logs" ADD CONSTRAINT "client_online_logs_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "tenant_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "tenant_api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;
