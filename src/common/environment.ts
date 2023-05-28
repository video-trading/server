import * as process from 'process';

export const Environments = {
  database_url: process.env.DATABASE_URL,
  jwt_secret: process.env.JWT_SECRET || 'secret',
  rabbit_mq_url: process.env.RABBITMQ_URI,
  faucet_url: process.env.FAUCET_URL,
  is_test: process.env.NODE_ENV === 'test',
  redis_url: process.env.REDIS_URL,
};
