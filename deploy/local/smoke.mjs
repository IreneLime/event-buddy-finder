import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

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

async function signIn(email) {
  const response = await request(
    'http://127.0.0.1:19099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local-demo',
    {
      method: 'POST',
      headers: json,
      body: JSON.stringify({
        email,
        password: 'demo only',
        returnSecureToken: true,
      }),
    },
  );
  const { idToken } = await response.json();
  assert.ok(idToken);
  return idToken;
}

execFileSync('./install.sh', { stdio: 'inherit' });
await request('http://127.0.0.1:5180');
const token = await signIn('cathy.chen@example.com');
await signIn('mina.park@example.com');
const events = await (await request(eventsUrl)).json();
assert.ok(events.items.some(event => event.title === 'Event Buddy Demo Meetup'));

const title = 'Deployment smoke test';
const created = await request(eventsUrl, {
  method: 'POST',
  headers: { ...json, Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    title,
    description: 'This event should survive stopping and restarting the local stack.',
    startsAt: new Date(Date.now() + 86_400_000).toISOString(),
    locationName: 'Toronto',
  }),
});
const { id } = await created.json();
assert.ok(id);

execFileSync('./install.sh', ['--stop'], { stdio: 'inherit' });
execFileSync('./install.sh', { stdio: 'inherit' });
await signIn('cathy.chen@example.com');
const saved = await (await request(`${eventsUrl}/${encodeURIComponent(id)}`)).json();
assert.equal(saved.title, title);
console.log('Seeded sign-in works and the saved event survived a stop and restart.');
