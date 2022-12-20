import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PrismaService } from '../prisma.service';
import { TransactionService } from '../transaction/transaction.service';
import { UserService } from '../user/user.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { StorageService } from '../storage/storage.service';

@Module({
  providers: [
    TransactionService,
    PrismaService,
    PaymentService,
    UserService,
    BlockchainService,
    StorageService,
  ],
  controllers: [PaymentController],
})
export class PaymentModule {}
