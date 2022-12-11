import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { PrismaService } from '../prisma.service';
import { CategoryController } from './category.controller';

@Module({
  providers: [PrismaService, CategoryService],
  controllers: [CategoryController],
})
export class CategoryModule {}
