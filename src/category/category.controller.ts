import { Controller, Get } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

import { GetCategoryDto } from './dto/get-category.dto';
import { CategoryService } from './category.service';

@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiExtraModels(GetCategoryDto)
  @ApiOkResponse({
    description: 'Find all categories',
    schema: {
      type: 'array',
      items: {
        $ref: getSchemaPath(GetCategoryDto),
      },
    },
  })
  @Get()
  findAll() {
    return this.categoryService.findAll();
  }
}
