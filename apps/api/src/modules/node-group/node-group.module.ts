import { Module } from '@nestjs/common';
import { NodeGroupController } from './node-group.controller';
import { NodeGroupService } from './node-group.service';
import { NodeSelectorService } from './node-selector.service';

@Module({
  controllers: [NodeGroupController],
  providers: [NodeGroupService, NodeSelectorService],
  exports: [NodeGroupService, NodeSelectorService],
})
export class NodeGroupModule {}
