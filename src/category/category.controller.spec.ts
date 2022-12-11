import { Test, TestingModule } from '@nestjs/testing';
import { CategoryController } from './category.controller';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { PrismaService } from '../prisma.service';
import { CategoryService } from './category.service';

describe('CategoryController', () => {
  let controller: CategoryController;

  let mongod: MongoMemoryReplSet;
  let prisma: PrismaService;

  beforeAll(async () => {
    mongod = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
  });

  afterAll(async () => {
    await mongod.stop();
  });

  beforeEach(async () => {
    process.env.DATABASE_URL = mongod.getUri('video');
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [CategoryService, PrismaService],
    }).compile();

    controller = module.get<CategoryController>(CategoryController);
    prisma = module.get<PrismaService>(PrismaService);

    await prisma.category.create({
      data: {
        name: 'category',
        Subcategory: {
          create: {
            name: 'subcategory1',
          },
        },
      },
    });

    await prisma.category.create({
      data: {
        name: 'category2',
        Subcategory: {
          create: {
            name: 'subcategory1',
          },
        },
      },
    });
  });

  it('Should be able to findAll categories', async () => {
    const categories = await controller.findAll();
    expect(categories.length).toBe(2);
    expect(categories[0].name).toBe('category');
    expect(categories[1].name).toBe('category2');
  });
});
