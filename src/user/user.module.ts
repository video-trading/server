import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaService } from '../prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { StorageService } from '../storage/storage.service';

@Module({
  controllers: [UserController],
  providers: [StorageService, UserService, PrismaService, BlockchainService],
})
export class UserModule {}
