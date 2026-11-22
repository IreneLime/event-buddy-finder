const urls = [
  'http://127.0.0.1:5173',
  ...[4001, 4002, 4003, 4004, 4005].map(port => `http://127.0.0.1:${port}/health`),
];
await Promise.all(urls.map(async url => {
  const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
}));
