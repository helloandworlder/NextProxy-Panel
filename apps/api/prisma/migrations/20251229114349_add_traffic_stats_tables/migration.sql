-- CreateTable
CREATE TABLE "node_stats" (
    "id" UUID NOT NULL,
    "node_id" UUID NOT NULL,
    "up" BIGINT NOT NULL DEFAULT 0,
    "down" BIGINT NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "node_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbound_stats" (
    "id" UUID NOT NULL,
    "inbound_id" UUID NOT NULL,
    "up" BIGINT NOT NULL DEFAULT 0,
    "down" BIGINT NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inbound_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traffic_time_series" (
    "id" UUID NOT NULL,
    "entity_type" VARCHAR(20) NOT NULL,
    "entity_id" UUID NOT NULL,
    "up" BIGINT NOT NULL DEFAULT 0,
    "down" BIGINT NOT NULL DEFAULT 0,
    "bucket_time" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "traffic_time_series_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "node_stats_node_id_timestamp_idx" ON "node_stats"("node_id", "timestamp");

-- CreateIndex
CREATE INDEX "inbound_stats_inbound_id_timestamp_idx" ON "inbound_stats"("inbound_id", "timestamp");

-- CreateIndex
CREATE INDEX "traffic_time_series_entity_type_entity_id_bucket_time_idx" ON "traffic_time_series"("entity_type", "entity_id", "bucket_time");

-- CreateIndex
CREATE UNIQUE INDEX "traffic_time_series_entity_type_entity_id_bucket_time_key" ON "traffic_time_series"("entity_type", "entity_id", "bucket_time");

-- AddForeignKey
ALTER TABLE "node_stats" ADD CONSTRAINT "node_stats_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbound_stats" ADD CONSTRAINT "inbound_stats_inbound_id_fkey" FOREIGN KEY ("inbound_id") REFERENCES "inbounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
