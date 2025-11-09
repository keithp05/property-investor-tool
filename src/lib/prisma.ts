import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// For Amplify deployment - environment variables aren't exposed properly
const databaseUrl = process.env.DATABASE_URL ||
  'postgresql://rentaliq_admin:vH%5D%3A%29Qr8OgebcgIC%3F%28J%3FaGloBWMpw8q%24@rentaliq-lab-db.ccd0y2cs49a2.us-east-1.rds.amazonaws.com:5432/rentaliq';

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
