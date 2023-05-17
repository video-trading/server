import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Environments } from './common/environment';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async addTTLIndex() {
    try {
      await this.$runCommandRaw({
        collMod: 'SalesLockInfo',
        index: {
          keyPattern: { lockUntil: 1 },
          expireAfterSeconds: 0,
        },
      });
    } catch (e) {
      if (!Environments.is_test) {
        console.log(e);
      }
    }
  }

  async onModuleInit() {
    await this.$connect();
    await this.addTTLIndex();
  }

  async enableShutdownHooks(app: INestApplication) {
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }
}
