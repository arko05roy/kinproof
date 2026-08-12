import { Buffer } from 'node:buffer';
import { createWriteStream } from 'node:fs';
import {
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { WebSocket } from 'ws';
import { createClient } from 'graphql-ws';
import { HDWallet, Roles } from '@midnightntwrk/wallet-sdk';
import * as ledger from '@midnight-ntwrk/midnight-js-protocol/ledger';

const seed = process.env.SEED;
if (!seed || !/^[0-9a-fA-F]{64,128}$/.test(seed) || seed.length % 2 !== 0) {
  throw new Error('SEED must be a 64-128 character even-length hex string');
}
const snapshotPath = process.env.DUST_SNAPSHOT ?? './dust-snapshot.json';
const rangeSize = Number(process.env.DUST_RANGE_SIZE ?? '20000');
const concurrency = Number(process.env.DUST_CONCURRENCY ?? '12');
const wsUrl = 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws';
const workDir = './.dust-ranges';
const subscription = `subscription DustLedgerEvents($id: Int) {
  dustLedgerEvents(id: $id) {
    type: __typename
    id
    raw
    maxId
  }
}`;

type DustEvent = {
  id: number;
  raw: string;
  maxId: number;
};

const snapshotText = await readFile(snapshotPath, 'utf8');
const snapshot = JSON.parse(snapshotText) as {
  state: string;
  offset?: string;
};
const initialOffset = BigInt(snapshot.offset ?? '0');
let localState = ledger.DustLocalState.deserialize(Buffer.from(snapshot.state, 'hex'));
const hdWallet = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
if (hdWallet.type !== 'seedOk') throw new Error('Failed to restore HD wallet');
const derivation = hdWallet.hdWallet.selectAccount(0).selectRoles([Roles.Dust]).deriveKeysAt(0);
if (derivation.type !== 'keysDerived') throw new Error('Failed to derive DUST key');
hdWallet.hdWallet.clear();
const dustSecretKey = ledger.DustSecretKey.fromSeed(derivation.keys[Roles.Dust]);

const firstEvent = await new Promise<DustEvent>((resolve, reject) => {
  const client = createClient({ url: wsUrl, webSocketImpl: WebSocket });
  let dispose = () => {};
  dispose = client.subscribe(
    {
      query: subscription,
      variables: { id: Number(initialOffset) },
    },
    {
      next: (payload) => {
        const event = (payload.data as { dustLedgerEvents: DustEvent }).dustLedgerEvents;
        resolve(event);
        dispose();
        void client.dispose();
      },
      error: reject,
      complete: () => {},
    },
  );
});

const tip = firstEvent.maxId;
const firstId = Number(initialOffset) + 1;
if (firstId > tip) {
  console.log(`DUST checkpoint is already at the event tip: ${tip}`);
  process.exit(0);
}

await rm(workDir, { recursive: true, force: true });
await mkdir(workDir, { recursive: true });

const ranges: Array<{ start: number; end: number; path: string }> = [];
for (let start = firstId; start <= tip; start += rangeSize) {
  const end = Math.min(start + rangeSize - 1, tip);
  ranges.push({
    start,
    end,
    path: `${workDir}/${String(start).padStart(10, '0')}-${String(end).padStart(10, '0')}.bin`,
  });
}

console.log(`DUST checkpoint: ${initialOffset}`);
console.log(`DUST event tip: ${tip}`);
console.log(`Downloading ${ranges.length} ordered ranges with concurrency ${concurrency}...`);

const downloadRange = ({ start, end, path }: (typeof ranges)[number]): Promise<void> =>
  new Promise((resolve, reject) => {
    const output = createWriteStream(path, { flags: 'w', mode: 0o600 });
    const client = createClient({ url: wsUrl, webSocketImpl: WebSocket });
    let settled = false;
    let dispose = () => {};

    const finish = () => {
      if (settled) return;
      settled = true;
      dispose();
      void client.dispose();
      output.end(() => {
        console.log(`Downloaded DUST events ${start}-${end}`);
        resolve();
      });
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      dispose();
      void client.dispose();
      output.destroy();
      reject(error);
    };

    output.on('error', fail);
    dispose = client.subscribe(
      {
        query: subscription,
        variables: { id: start },
      },
      {
        next: (payload) => {
          const event = (payload.data as { dustLedgerEvents: DustEvent }).dustLedgerEvents;
          if (event.id < start) return;
          if (event.id > end) {
            finish();
            return;
          }
          output.write(Buffer.from(event.raw, 'hex'));
          if (event.id === end) finish();
        },
        error: fail,
        complete: () => {
          if (!settled) fail(new Error(`DUST subscription ended before ${end}`));
        },
      },
    );
  });

let nextRange = 0;
const workers = Array.from({ length: Math.min(concurrency, ranges.length) }, async () => {
  while (true) {
    const index = nextRange++;
    if (index >= ranges.length) return;
    await downloadRange(ranges[index]);
  }
});
await Promise.all(workers);

console.log('Replaying downloaded DUST ranges in ledger order...');
for (const range of ranges) {
  const rawEvents = await readFile(range.path);
  const replayed = localState.replayRawEvents(
    dustSecretKey,
    rawEvents,
  );
  localState = replayed.state;
  console.log(`Replayed through DUST event ${range.end}`);
}

snapshot.state = Buffer.from(localState.serialize()).toString('hex');
snapshot.offset = String(tip);
const temporaryPath = `${snapshotPath}.tmp`;
await writeFile(temporaryPath, JSON.stringify(snapshot), { mode: 0o600 });
await rename(temporaryPath, snapshotPath);
console.log(`Saved DUST checkpoint at event ${tip}: ${snapshotPath}`);

