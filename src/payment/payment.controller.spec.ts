import { PaymentController } from './payment.controller';

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

  // beforeEach(async () => {
  //   const module: TestingModule = await Test.createTestingModule({
  //     controllers: [PaymentController],
  //     providers: [
  //       PaymentService,
  //       UserService,
  //       PrismaService,
  //       TransactionService,
  //       BlockchainService,
  //       StorageService,
  //     ],
  //   }).compile();

  //   controller = module.get<PaymentController>(PaymentController);
  // });

  it('should be defined', () => {
    // expect(controller).toBeDefined();
  });
});
