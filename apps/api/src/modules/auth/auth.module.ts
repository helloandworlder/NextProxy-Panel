import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ApiKeyStrategy } from './strategies/api-key.strategy';
import { NodeTokenStrategy } from './strategies/node-token.strategy';
import { JwtAuthGuard, ApiKeyGuard, NodeTokenGuard, RolesGuard, ScopesGuard } from './guards';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '7d') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    ApiKeyStrategy,
    NodeTokenStrategy,
    JwtAuthGuard,
    ApiKeyGuard,
    NodeTokenGuard,
    RolesGuard,
    ScopesGuard,
  ],
  exports: [
    AuthService,
    JwtModule,
    JwtAuthGuard,
    ApiKeyGuard,
    NodeTokenGuard,
    RolesGuard,
    ScopesGuard,
  ],
})
export class AuthModule {}
