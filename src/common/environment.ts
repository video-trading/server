import * as process from 'process';

export const Environments = {
  database_url: process.env.DATABASE_URL,
  jwt_secret: process.env.JWT_SECRET,
  rabbit_mq_url: process.env.RABBITMQ_URI,
};
