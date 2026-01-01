import { Module } from '@nestjs/common';
import { GoSeaModule } from './gosea/gosea.module';

@Module({
  imports: [GoSeaModule],
  exports: [GoSeaModule],
})
export class PluginModule {}
