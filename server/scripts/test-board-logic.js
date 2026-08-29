require('dotenv').config();
const prisma = require('../src/db/index');
const jwt = require('jsonwebtoken');

async function test() {
  console.log('Testing D1 Client include logic...');
  try {
    // 1. Create a dummy user
    const email = 'test@example.com';
    const user = await prisma.user.upsert({
      where: { email },
      update: { name: 'Test User' },
      create: { email, name: 'Test User', googleId: '123' }
    });
    console.log('User:', user.id);

    // 2. Fetch user with include
    const fetchedUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { subscription: { include: { plan: true } } }
    });
    
    console.log('Fetched User with Subscription:', JSON.stringify(fetchedUser, null, 2));

    // 3. Try to get the free plan
    const freePlan = await prisma.plan.findUnique({ where: { name: 'free' } });
    console.log('Free Plan:', JSON.stringify(freePlan, null, 2));

    // 4. Test board limit logic
    const plan = (fetchedUser.subscription?.status === 'active' && fetchedUser.subscription.plan)
      ? fetchedUser.subscription.plan
      : freePlan;
    
    console.log('Selected Plan:', plan?.displayName);
    if (!plan) {
      console.log('ERROR: Plan is null! boardLimit will crash!');
    } else {
      console.log('Plan boardLimit:', plan.boardLimit);
    }
  } catch (err) {
    console.error('Error during test:', err);
  }
}
test();
