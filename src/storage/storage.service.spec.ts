import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(async () => {
    process.env.SERVER_AWS_ACCESS_KEY_ID = 'test';
    process.env.SERVER_AWS_SECRET_ACCESS_KEY = 'test';
    process.env.SERVER_AWS_ENDPOINT = 'https://some-endpoint';
    process.env.SERVER_AWS_REGION = 'sgp1';
    process.env.SERVER_AWS_BUCKET_NAME = 'test';
    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageService],
      imports: [ConfigModule],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  it('should be defined', () => {
    const preSignedURL = service.generatePreSignedUrlForVideoUpload({
      id: '1',
      title: 'test',
      url: 'test',
      fileName: 'test-video.mp4',
      createdAt: new Date(),
      updatedAt: new Date(),
      thumbnail: '',
      views: 0,
      likes: 0,
      dislikes: 0,
    });

    expect(preSignedURL).toBeDefined();
  });
});
