import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';

jest.mock('aws-sdk', () => ({
  S3: require('../test-utils/aws-sdk.mock').S3,
}));

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageService],
      imports: [ConfigModule],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  it('should be defined', () => {
    const preSignedURL = service.generatePreSignedUrl({
      id: '1',
      title: 'test',
      url: 'test',
      createdAt: new Date(),
      updatedAt: new Date(),
      thumbnail: '',
      duration: 0,
      views: 0,
      likes: 0,
      dislikes: 0,
    });

    expect(preSignedURL).toBeDefined();
  });
});
