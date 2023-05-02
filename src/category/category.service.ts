import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({
      where: {
        parent: null,
      },
      include: {
        subCategories: true,
      },
    });
  }

  findOne(id: string) {
    return this.prisma.category.findUnique({
      where: {
        id,
      },
      include: {
        subCategories: true,
      },
    });
  }
}
