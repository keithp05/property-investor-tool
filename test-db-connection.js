const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://rentaliq_admin:vH%5D%3A%29Qr8OgebcgIC%3F%28J%3FaGloBWMpw8q%24@rentaliq-lab-db.ccd0y2cs49a2.us-east-1.rds.amazonaws.com:5432/rentaliq'
    }
  }
});

async function test() {
  try {
    const result = await prisma.$queryRaw`SELECT current_database()`;
    console.log('✅ Database connected:', result);
    
    const users = await prisma.user.findMany();
    console.log('✅ Users table accessible. Count:', users.length);
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
