import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const eventsUrl = 'http://127.0.0.1:14001/events';
const json = { 'Content-Type': 'application/json' };

async function request(url, init) {
  // The installer restarts Docker on the same ports, so each request needs
  // its own connection rather than one pooled before the restart.
  const response = await fetch(url, {
    ...init,
    headers: { ...init?.headers, Connection: 'close' },
    signal: AbortSignal.timeout(10_000),
  }).catch(error => {
    throw new Error(`Could not reach ${url}`, { cause: error });
  });
  if (!response.ok) throw new Error(`${url}: ${response.status} ${await response.text()}`);
  return response;
}

const compose = (...args) => execFileSync('docker', [
  'compose', '--project-name', 'event-buddy-local', '--file', 'deploy/local/compose.yaml', ...args,
], { encoding: 'utf8' }).trim();
const query = sql => compose(
  'exec', '-T', 'database', 'psql', '-U', 'event_buddy', '-d', 'event_buddy_finder', '-Atqc', sql,
);

// The deployment smoke test must not need real Firebase or Spaces credentials.
// It only checks anonymous browsing and local PostgreSQL persistence.
const envFile = '.env';
const hadEnvFile = existsSync(envFile);
const originalEnv = hadEnvFile ? readFileSync(envFile) : undefined;
const credentialsDirectory = mkdtempSync(join(tmpdir(), 'event-buddy-smoke-'));
const credentialsPath = join(credentialsDirectory, 'firebase-admin.json');
const projectId = 'event-buddy-local-smoke';
writeFileSync(credentialsPath, JSON.stringify({
  type: 'service_account',
  project_id: projectId,
  client_email: 'smoke@example.invalid',
  private_key: 'smoke-only-not-a-real-private-key',
}));
writeFileSync(envFile, [
  'VITE_FIREBASE_API_KEY=local-smoke-only',
  'VITE_FIREBASE_AUTH_DOMAIN=event-buddy-local-smoke.firebaseapp.com',
  `VITE_FIREBASE_PROJECT_ID=${projectId}`,
  `GOOGLE_APPLICATION_CREDENTIALS=${credentialsPath}`,
  'SPACES_ENDPOINT=https://spaces.example.invalid',
  'SPACES_REGION=us-east-1',
  'SPACES_BUCKET=local-smoke-only',
  'SPACES_ACCESS_KEY_ID=local-smoke-only',
  'SPACES_SECRET_ACCESS_KEY=local-smoke-only',
].join('\n') + '\n');

try {
  execFileSync('./install.sh', { stdio: 'inherit' });
  await request('http://127.0.0.1:5180');
  const events = await (await request(eventsUrl)).json();
  assert.ok(events.items.some(event => event.title === 'Event Buddy Demo Meetup'));
  assert.equal(query("SELECT count(*) FROM events WHERE image_object_key LIKE 'event-images/%'").trim(), '22');

  const title = `Deployment smoke test ${Date.now()}`;
  const createdId = query(`
    INSERT INTO events (created_by_user_id, title, description, starts_at, location_name, city, status)
    VALUES ('demo-cathy', '${title}', 'Persistence smoke test.', now() + interval '1 day', 'Toronto', 'Toronto', 'scheduled')
    RETURNING id
  `);
  assert.ok(createdId);

  execFileSync('./install.sh', ['--stop'], { stdio: 'inherit' });
  execFileSync('./install.sh', { stdio: 'inherit' });
  const savedTitle = query(`SELECT title FROM events WHERE id = ${Number(createdId)}`).trim();
  assert.equal(savedTitle, title);
  console.log('Public event browsing, seeded image keys, and database persistence passed.');
} finally {
  try { execFileSync('./install.sh', ['--stop'], { stdio: 'inherit' }); } catch { /* cleanup is best effort */ }
  rmSync(credentialsDirectory, { recursive: true, force: true });
  if (hadEnvFile) writeFileSync(envFile, originalEnv);
  else rmSync(envFile, { force: true });
}
