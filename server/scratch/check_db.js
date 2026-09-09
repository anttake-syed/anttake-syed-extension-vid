require('dotenv').config({ path: '../.env' });
const prisma = require('../src/db/index.js');

async function main() {
  const users = await prisma.user.findMany({ take: 1 });
  if (users.length === 0) {
    console.log("No users found");
    return;
  }
  const userId = users[0].id;
  const captures = await prisma.capture.findMany({
    where: { userId },
    include: { storageObject: true }
  });
  
  console.log(`Found ${captures.length} total captures for user ${userId}.`);
  captures.forEach(c => {
    console.log(`- Capture ${c.id}: status=${c.status}`);
    if (c.storageObject) {
      console.log(`  Storage: provider=${c.storageObject.provider}, status=${c.storageObject.status}, size=${c.storageObject.sizeBytes}`);
    } else {
      console.log(`  Storage: NONE`);
    }
  });
}
main().finally(() => prisma.$disconnect());
