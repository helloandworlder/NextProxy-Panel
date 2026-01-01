import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SystemAdminController } from './system-admin.controller';
import { SystemAdminService } from './system-admin.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [SystemAdminController],
  providers: [SystemAdminService],
  exports: [SystemAdminService],
})
export class SystemAdminModule {}
