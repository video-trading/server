export const PaginationSchema = {
  type: 'object',
  properties: {
    metadata: {
      type: 'object',
      properties: {
        total: {
          type: 'number',
        },
        per: {
          type: 'number',
        },
        page: {
          type: 'number',
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
  };
};
