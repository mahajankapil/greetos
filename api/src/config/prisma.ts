import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  // Increase the default interactive-transaction timeout from 5 s to 30 s.
  // Product updates that touch categories, concerns, and options in a single
  // transaction can exceed the default when the DB connection is under load.
  transactionOptions: {
    maxWait: 10000,   // max ms to wait for a connection from the pool
    timeout: 30000,   // max ms the transaction may run before auto-rollback
  },
});
