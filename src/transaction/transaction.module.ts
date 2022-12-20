import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { PrismaService } from '../prisma.service';
import { UserService } from '../user/user.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { StorageService } from '../storage/storage.service';

@Module({
  providers: [
    TransactionService,
    PrismaService,
    UserService,
    BlockchainService,
    StorageService,
  ],
  controllers: [TransactionController],
})
export class TransactionModule {}
