import { Injectable } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL is not configured');
    }

    super({
      adapter: new PrismaPg({ connectionString }),
      // Les batchs d'ingestion (upserts par lots de 100) peuvent dépasser le timeout
      // de transaction par défaut (5 s) sous charge — on l'élargit pour éviter les
      // échecs intermittents « transaction expired » sur les gros dumps.
      transactionOptions: { timeout: 60_000, maxWait: 15_000 },
    });
  }
}
