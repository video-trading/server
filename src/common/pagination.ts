import { config } from './utils/config/config';
import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

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
  // verify page, per and total are number
  const verified = z
    .object({
      page: z.number().gte(1),
      per: z.number().gte(1),
      total: z.number().gte(0),
    })
    .parse({
      page,
      per,
      total,
    });

  return {
    total: verified.total,
    per: verified.per,
    page: verified.page,
    totalPages: Math.ceil(verified.total / verified.per),
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
