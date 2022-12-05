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
