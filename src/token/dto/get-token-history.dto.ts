import { z } from 'zod';

export const GetTokenHistorySchema = z.object({
  _id: z.string(),
  transactions: z.array(
    z.object({
      _id: z.string(),
      value: z.string(),
      timestamp: z.string(),
      type: z.string(),
      txHash: z.string().optional(),
      Video: z
        .object({
          thumbnail: z.string(),
          _id: z.string(),
          title: z.string(),
        })
        .optional(),
    }),
  ),
});

export type GetTokenHistoryDto = z.infer<typeof GetTokenHistorySchema>;
export const GetTokenHistoryCountSchema = z
  .object({
    total: z.number().int().positive(),
  })
  .array();
