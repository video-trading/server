import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { Environments } from '../common/environment';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { UserService } from '../user/user.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './local.strategy';
import { PrismaService } from '../prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: Environments.jwt_secret,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    UserService,
    LocalStrategy,
    PrismaService,
    BlockchainService,
  ],
  exports: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
