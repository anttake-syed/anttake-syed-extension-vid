require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const ls = await prisma.lemonSqueezyCustomer.findMany({ include: { user: { include: { subscription: true } } }});
  console.log(JSON.stringify(ls, null, 2));
}
check().catch(console.error).finally(() => prisma.$disconnect());
