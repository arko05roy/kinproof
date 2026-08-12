import { useCallback, useEffect, useState } from 'react';
import { ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { Kinproof } from 'kinproof-contract';

const INDEXER_URL = import.meta.env.VITE_INDEXER_URL ??
  'https://indexer.preprod.midnight.network/api/v4/graphql';

const CONTRACT_STATE_QUERY = `
  query ContractState($address: HexEncoded!) {
    contractAction(address: $address) { state }
  }
`;

export interface PublicSeal {
  readonly commitment: string;
  readonly active: boolean;
  readonly revision: number;
}

export interface PublicKinproofState {
  readonly seals: readonly PublicSeal[];
  readonly sealCount: number;
  readonly refreshCount: number;
  readonly revokeCount: number;
}

const emptyState: PublicKinproofState = {
  seals: [], sealCount: 0, refreshCount: 0, revokeCount: 0,
};

const hexToBytes = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < hex.length; index += 2) {
    bytes[index / 2] = Number.parseInt(hex.slice(index, index + 2), 16);
  }
  return bytes;
};

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

export function useKinproofState(contractAddress: string | null, refreshInterval = 15_000) {
  const [state, setState] = useState<PublicKinproofState>(emptyState);
  const [loading, setLoading] = useState(Boolean(contractAddress));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!contractAddress || !/^[0-9a-fA-F]{64}$/.test(contractAddress)) return;
    try {
      setLoading(true);
      const response = await fetch(INDEXER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: CONTRACT_STATE_QUERY,
          variables: { address: contractAddress },
        }),
      });
      const payload = await response.json();
      if (payload.errors) throw new Error(payload.errors[0]?.message ?? 'Indexer query failed');
      const stateHex = payload.data?.contractAction?.state;
      if (!stateHex) throw new Error('Contract not found on Preprod');
      const ledger = Kinproof.ledger(ContractState.deserialize(hexToBytes(stateHex)).data);
      setState({
        seals: Array.from(ledger.seals, ([commitment, seal]) => ({
          commitment: bytesToHex(commitment),
          active: seal.active,
          revision: Number(seal.revision),
        })),
        sealCount: Number(ledger.sealCount),
        refreshCount: Number(ledger.refreshCount),
        revokeCount: Number(ledger.revokeCount),
      });
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [contractAddress]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!contractAddress) return;
    const timer = window.setInterval(() => void refresh(), refreshInterval);
    return () => window.clearInterval(timer);
  }, [contractAddress, refresh, refreshInterval]);

  return { state, loading, error, refresh };
}

