const { Client } = require('pg');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const NEON_URL = "postgresql://neondb_owner:npg_0KeTxgrPZto8@ep-raspy-bar-at2qul4d.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function main() {
  const client = new Client({ connectionString: NEON_URL });
  await client.connect();
  
  console.log('Connected to Neon DB');

  // 1. Users
  const resUsers = await client.query('SELECT * FROM "User"');
  console.log(`Found ${resUsers.rows.length} users`);
  for (const row of resUsers.rows) {
    await prisma.user.upsert({
      where: { email: row.email },
      update: {},
      create: {
        id: row.id,
        email: row.email,
        name: row.name,
        picture: row.picture,
        googleId: row.googleId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }
    });
  }

  // 2. Sessions
  const resSessions = await client.query('SELECT * FROM "Session"');
  console.log(`Found ${resSessions.rows.length} sessions`);
  for (const row of resSessions.rows) {
    try {
      await prisma.session.upsert({
        where: { id: row.id },
        update: {},
        create: {
          id: row.id,
          userId: row.userId,
          accessToken: row.accessToken,
          refreshToken: row.refreshToken,
          expiryDate: row.expiryDate,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }
      });
    } catch (err) {
      console.warn(`Could not insert session ${row.id}: ${err.message}`);
    }
  }

  // 3. Captures
  const resCaptures = await client.query('SELECT * FROM "Capture"');
  console.log(`Found ${resCaptures.rows.length} captures`);
  
  for (const row of resCaptures.rows) {
    // Check if capture already exists in SQLite
    const exists = await prisma.capture.findUnique({ where: { id: row.id } });
    if (exists) continue;

    const ext = row.type === 'video' ? (row.format || 'webm') : 'png';
    const hasAudio = row.hasAudio === true; // if missing, default to false
    
    // Create Capture
    try {
      await prisma.capture.create({
        data: {
          id: row.id,
          userId: row.userId,
          type: row.type,
          title: row.title,
          description: row.description,
          sourceUrl: row.sourceUrl,
          mimeType: row.mimeType,
          hasAudio: hasAudio,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }
      });
    } catch (err) {
      console.warn(`Could not insert capture ${row.id}: ${err.message}`);
      continue;
    }
    
    // Create StorageObject
    const provider = row.storageLocation === 'drive' ? 'google_drive' : 'local';
    let providerId = row.storageLocation === 'drive' && row.driveUrl ? row.driveUrl.split('/d/')[1]?.split('/')[0] : null;
    if (!providerId) providerId = row.id;
    
    let localPath = null;
    let byteSize = row.size ? parseInt(row.size) : 0;
    
    if (provider === 'local' && row.mediaData) {
      const userDir = path.join(__dirname, '..', 'uploads', row.userId);
      if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
      
      const fileName = `${row.id}.${ext}`;
      localPath = path.join(userDir, fileName);
      
      fs.writeFileSync(localPath, row.mediaData);
      byteSize = fs.statSync(localPath).size;
      console.log(`Saved blob for capture ${row.id} to ${localPath}`);
    }

    try {
      await prisma.storageObject.create({
        data: {
          captureId: row.id,
          provider: provider,
          providerObjectId: providerId,
          byteSize: byteSize,
          providerMeta: row.storageLocation === 'drive' ? { webViewLink: row.driveUrl } : {},
          localPath: localPath
        }
      });
    } catch (err) {
      console.warn(`Could not insert storage object for ${row.id}: ${err.message}`);
    }
  }

  console.log('Migration completed successfully');
  await client.end();
}

main().catch(console.error).finally(() => prisma.$disconnect());
