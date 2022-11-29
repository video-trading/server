import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma.service';
import { TranscodingController } from './transcoding.controller';
import { TranscodingService } from './transcoding.service';

describe('TranscodingController', () => {
  let controller: TranscodingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TranscodingController],
      providers: [
        TranscodingService,
        PrismaService,
        TranscodingService,
        StorageService,
      ],
    }).compile();

    controller = module.get<TranscodingController>(TranscodingController);
  });

  it('should be defined', () => {});
});
