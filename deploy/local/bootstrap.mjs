import { createRequire } from 'node:module';

const authRequire = createRequire(new URL('../../services/auth-api/package.json', import.meta.url));
const storageRequire = createRequire(new URL('../../packages/storage/package.json', import.meta.url));
const { initializeApp } = authRequire('firebase-admin/app');
const { getAuth } = authRequire('firebase-admin/auth');
const { S3Client, CreateBucketCommand, HeadBucketCommand } = storageRequire('@aws-sdk/client-s3');

if (!process.env.FIREBASE_AUTH_EMULATOR_HOST || !process.env.FIREBASE_PROJECT_ID?.startsWith('demo-')) {
  throw new Error('Demo accounts require the local Firebase emulator.');
}

const auth = getAuth(initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID }));
for (const [uid, displayName, email] of [
  ['demo-cathy', 'Cathy Chen', 'cathy.chen@example.com'],
  ['demo-mina', 'Mina Park', 'mina.park@example.com'],
]) {
  const account = { displayName, email, emailVerified: true, password: 'demo only' };
  try {
    await auth.createUser({ uid, ...account });
  } catch (error) {
    if (error.code !== 'auth/uid-already-exists') throw error;
    await auth.updateUser(uid, account);
  }
}

const storage = new S3Client({
  endpoint: process.env.SPACES_ENDPOINT,
  region: 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.SPACES_ACCESS_KEY_ID,
    secretAccessKey: process.env.SPACES_SECRET_ACCESS_KEY,
  },
});
const bucket = { Bucket: process.env.SPACES_BUCKET };
try {
  await storage.send(new HeadBucketCommand(bucket));
} catch (error) {
  if (error.$metadata?.httpStatusCode !== 404) throw error;
  await storage.send(new CreateBucketCommand(bucket));
}
storage.destroy();
