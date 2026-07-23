const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const captures = await prisma.capture.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  captures.forEach(c => {
    console.log(`ID: ${c.id}, Type: ${c.type}, Title: ${c.title}, mediaData length: ${c.mediaData ? c.mediaData.length : 'NULL'}`);
  });
}

run().catch(console.error).finally(() => prisma.$disconnect());
