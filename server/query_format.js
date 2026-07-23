const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const captures = await prisma.capture.findMany({
    where: { type: 'video' },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  
  captures.forEach(c => {
    console.log(`ID: ${c.id}, Title: ${c.title}, MimeType: ${c.mimeType}`);
  });
}

run().catch(console.error).finally(() => prisma.$disconnect());
