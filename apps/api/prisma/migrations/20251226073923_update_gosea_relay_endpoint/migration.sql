/*
  Warnings:

  - You are about to drop the column `client_id` on the `gosea_relay_endpoints` table. All the data in the column will be lost.
  - You are about to drop the column `inbound_id` on the `gosea_relay_endpoints` table. All the data in the column will be lost.
  - You are about to drop the column `outbound_id` on the `gosea_relay_endpoints` table. All the data in the column will be lost.
  - Added the required column `inbound_port` to the `gosea_relay_endpoints` table without a default value. This is not possible if the table is not empty.
  - Added the required column `target_socks5` to the `gosea_relay_endpoints` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uuid` to the `gosea_relay_endpoints` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "gosea_relay_endpoints" DROP COLUMN "client_id",
DROP COLUMN "inbound_id",
DROP COLUMN "outbound_id",
ADD COLUMN     "inbound_port" INTEGER NOT NULL,
ADD COLUMN     "protocol" VARCHAR(20) NOT NULL DEFAULT 'vless',
ADD COLUMN     "target_socks5" JSONB NOT NULL,
ADD COLUMN     "uuid" VARCHAR(36) NOT NULL;

-- CreateIndex
CREATE INDEX "gosea_relay_endpoints_uuid_idx" ON "gosea_relay_endpoints"("uuid");

-- AddForeignKey
ALTER TABLE "gosea_relay_endpoints" ADD CONSTRAINT "gosea_relay_endpoints_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
