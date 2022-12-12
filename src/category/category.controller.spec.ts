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

    const category1 = await prisma.category.create({
      data: {
        name: 'category',
      },
    });

    await prisma.category.create({
      data: {
        name: 'category1-1',
        parentId: category1.id,
      },
    });

    const category2 = await prisma.category.create({
      data: {
        name: 'category2',
      },
    });

    await prisma.category.create({
      data: {
        name: 'category2-1',
        parentId: category2.id,
      },
    });
  });

  it('Should be able to findAll categories', async () => {
    const categories = await controller.findAll();
    expect(categories.length).toBe(2);
    expect(categories[0].name).toBe('category');
    expect(categories[1].name).toBe('category2');
    expect(categories[0].subCategories.length).toBe(1);
    expect(categories[1].subCategories.length).toBe(1);
  });
});
