import { IsString } from 'class-validator';
import { z } from 'zod';

export const PaymentMethodSchema = z.enum(['fiat', 'token']);

export const PricesEnumSchema = z.enum([
  'platform-commission',
  'gas-fee',
  'total',
]);

export type PricesEnum = z.infer<typeof PricesEnumSchema>;

export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
export class GetPaymentInfoDto {
  video: GetPaymentInfoVideo;
  salesInfo: GetPaymentInfoSalesInfo;
}

class GetPaymentInfoVideo {
  @IsString()
  id: string;
  @IsString()
  title: string;
  @IsString()
  thumbnail: string;
  Category: GetPaymentInfoCategory;
  User: GetPaymentInfoUser;
  SalesInfo: GetPaymentInfoVideoSalesInfo;
  purchasable: boolean;
}

class GetPaymentInfoCategory {
  name: string;
}

class GetPaymentInfoUser {
  name: string;
}

class GetPaymentInfoVideoSalesInfo {
  price: string;
  unit: string;
}

class GetPaymentInfoSalesInfo {
  prices: GetPaymentInfoSalesInfoPrices[];
  total: GetPaymentInfoSalesInfoTotal;
}

class GetPaymentInfoSalesInfoPrices {
  name: PricesEnum;
  price: string;
  unit: string;
}

class GetPaymentInfoSalesInfoTotal {
  price: string;
  unit: string;
  priceInNumber: number;
}
