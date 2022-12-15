import { PrismaClient } from '@prisma/client';
import Categories from './categories.json';

const prisma = new PrismaClient();

async function addCategories() {
  for (const category of Categories) {
    const createdCategory = await prisma.category.create({
      data: {
        name: category.name,
      },
    });

    await prisma.category.createMany({
      data: category.subCategories.map((subCategory) => ({
        name: subCategory.name,
        parentId: createdCategory.id,
      })),
    });
  }
}

async function main() {
  await addCategories();
}

main()
  .catch((e) => {
    throw e;
  })
  .then(async () => {
    await prisma.$disconnect();
  });
