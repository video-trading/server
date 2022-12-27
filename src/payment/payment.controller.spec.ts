import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma.service';
import { TransactionService } from '../transaction/transaction.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { StorageService } from '../storage/storage.service';

jest.mock('braintree', () => ({
  Environment: {
    Sandbox: 'sandbox',
  },
  BraintreeGateway: jest.fn().mockImplementation(() => ({
    clientToken: {
      generate: jest.fn().mockImplementation(() => ({
        clientToken: 'client',
      })),
    },
    transaction: {
      sale: jest.fn().mockImplementation(() => ({
        transaction: {
          id: 'id',
          amount: 'amount',
          status: 'status',
          success: true,
        },
        success: true,
      })),
    },
  })),
}));

describe('PaymentController', () => {
  let controller: PaymentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        PaymentService,
        UserService,
        PrismaService,
        TransactionService,
        BlockchainService,
        StorageService,
      ],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
