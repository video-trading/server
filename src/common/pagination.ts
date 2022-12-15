import { config } from './utils/config/config';
import { BadRequestException } from '@nestjs/common';

export const PaginationSchema = {
  type: 'object',
  properties: {
    metadata: {
      type: 'object',
      properties: {
        total: {
          type: 'number',
          description: 'Total number of items',
        },
        per: {
          type: 'number',
          description: 'Number of items per page',
        },
        page: {
          type: 'number',
          description: 'Current page number',
        },
        totalPages: {
          type: 'number',
          description: 'Total number of pages',
        },
      },
    },
  },
};

export const getPaginationMetaData = (
  page: number,
  per: number,
  total: number,
) => {
  return {
    total: total,
    per,
    page,
    totalPages: Math.ceil(total / per),
  };
};

export interface Pagination<T> {
  items: T[];
  metadata: {
    total: number;
    per: number;
    page: number;
    totalPages: number;
  };
}

/**
 * Get page and limit from query params
 * @param page
 * @param limit
 */
export function getPageAndLimit(
  page: string | undefined,
  limit: string | undefined,
) {
  // parse page and per to number
  const pageInt = page ? parseInt(page) : config.defaultStartingPage;
  const limitInt = limit ? parseInt(limit) : config.numberOfItemsPerPage;

  // if page or per is not a number, throw an error
  if (isNaN(pageInt) || isNaN(limitInt)) {
    throw new BadRequestException('page and per must be a number');
  }
  // if page or per is less than 1, throw an error
  if (pageInt < 1 || limitInt < 1) {
    throw new BadRequestException('page and per must be greater than 0');
  }
  return {
    page: pageInt,
    limit: limitInt,
  };
}
