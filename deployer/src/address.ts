import { getNetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { createKeystore, Roles } from '@midnight-ntwrk/wallet-sdk';
import { getOrCreateWallet } from './network.js';
import { deriveKeys } from './wallet.js';

const credentials = getOrCreateWallet('preprod');
setNetworkId('preprod');
const keys = deriveKeys(credentials.seed);
const keystore = createKeystore(keys[Roles.NightExternal], getNetworkId());
process.stdout.write(`${keystore.getBech32Address().toString()}\n`);
