import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { appendFileSync, mkdirSync } from 'node:fs';

const PORT = 9876;
const LOG_DIR = '/Users/etesam/Coding/bytebook/.claude/.debug';
const LOG_FILE = LOG_DIR + '/debug.log';

mkdirSync(LOG_DIR, { recursive: true });

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/ingest') {
    const body = await readBody(req);
    const timestamp = new Date().toISOString();
    let parsed: unknown;
    try { parsed = JSON.parse(body); } catch { parsed = body; }
    const entry = JSON.stringify({ timestamp, data: parsed }) + '\n';
    appendFileSync(LOG_FILE, entry);
    console.log(`[${timestamp}] Logged`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Debug server on http://localhost:${PORT}/ingest -> ${LOG_FILE}`);
});
