import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaService } from '../prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';

@Module({
  controllers: [UserController],
  providers: [UserService, PrismaService, BlockchainService],
})
export class UserModule {}
