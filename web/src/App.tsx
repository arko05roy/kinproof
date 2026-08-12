import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import type { RecoveryChecklist } from '../../contract/src/index.js';
import { BrowserKinproofManager, connectToWallet } from './contexts/BrowserKinproofManager.js';
import type { KinproofAPI } from '../../api/src/index.js';
import { useKinproofState } from './hooks/useKinproofState.js';
import pino from 'pino';

const NETWORK_ID = import.meta.env.VITE_NETWORK_ID ?? 'preprod';
const DEFAULT_CONTRACT = import.meta.env.VITE_DEFAULT_CONTRACT ?? '';

type WalletStatus = 'detecting' | 'missing' | 'ready' | 'connecting' | 'connected';
type CircuitAction = 'seal' | 'refresh' | 'revoke';
type ActionPhase = 'idle' | 'joining' | 'proving' | 'submitting' | 'confirmed';

const CHECKS: ReadonlyArray<{
  key: keyof RecoveryChecklist;
  title: string;
  detail: string;
}> = [
  { key: 'offlineBackup', title: 'Offline backup exists', detail: 'Recovery material is stored away from connected devices.' },
  { key: 'testedRecovery', title: 'Recovery was tested', detail: 'The process was rehearsed without moving real funds.' },
  { key: 'trustedContact', title: 'A trusted person is prepared', detail: 'Someone knows how to begin, but not the private details.' },
  { key: 'deviceAccessPlan', title: 'Device access is covered', detail: 'Locked devices and required credentials have a safe path.' },
  { key: 'currentInstructions', title: 'Instructions are current', detail: 'Networks, accounts, and locations were checked recently.' },
];

const emptyChecklist = (): RecoveryChecklist => ({
  offlineBackup: false,
  testedRecovery: false,
  trustedContact: false,
  deviceAccessPlan: false,
  currentInstructions: false,
});

const truncate = (value: string, start = 10, end = 8) =>
  value.length <= start + end + 1 ? value : `${value.slice(0, start)}…${value.slice(-end)}`;

const getInjectedWallet = (): InitialAPI | undefined => {
  if (!window.midnight) return undefined;
  return Object.values(window.midnight).find(
    (candidate): candidate is InitialAPI => Boolean(
      candidate && typeof candidate === 'object' && 'apiVersion' in candidate,
    ),
  );
};

const friendlyError = (cause: unknown): string => {
  const message = cause instanceof Error ? cause.message : String(cause);
  if (/reject|cancel/i.test(message)) return 'The wallet request was cancelled.';
  if (/DUST|insufficient/i.test(message)) return 'This wallet needs Preprod tNIGHT. Fund it from the faucet and retry.';
  if (/proof server|fetch/i.test(message)) return 'The proof service could not be reached. Check Lace’s Midnight settings.';
  if (/already has a seal/i.test(message)) return 'This private plan already has a Kinproof seal.';
  if (/seal not found/i.test(message)) return 'No seal controlled by this browser secret was found.';
  return message || 'The circuit could not be completed.';
};

export default function App() {
  const [walletStatus, setWalletStatus] = useState<WalletStatus>('detecting');
  const [wallet, setWallet] = useState<ConnectedAPI | null>(null);
  const [address, setAddress] = useState('');
  const [checklist, setChecklist] = useState<RecoveryChecklist>(emptyChecklist);
  const [contractAddress, setContractAddress] = useState(DEFAULT_CONTRACT);
  const [phase, setPhase] = useState<ActionPhase>('idle');
  const [currentAction, setCurrentAction] = useState<CircuitAction>('seal');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localSealState, setLocalSealState] = useState<'none' | 'active' | 'revoked'>(() => {
    if (typeof window === 'undefined') return 'none';
    return (localStorage.getItem('kinproof-local-seal-state') as 'active' | 'revoked' | null) ?? 'none';
  });

  const manager = useRef<BrowserKinproofManager | null>(null);
  if (!manager.current) {
    manager.current = new BrowserKinproofManager(pino({ level: 'warn', browser: { asObject: true } }));
  }

  const { state: publicState, loading: stateLoading, error: stateError, refresh } =
    useKinproofState(contractAddress || null);

  const completed = useMemo(
    () => CHECKS.filter(({ key }) => checklist[key]).length,
    [checklist],
  );
  const allReady = completed === CHECKS.length;
  const isBusy = phase !== 'idle' && phase !== 'confirmed';

  useEffect(() => {
    const detected = getInjectedWallet();
    if (detected) { setWalletStatus('ready'); return; }
    let elapsed = 0;
    const timer = window.setInterval(() => {
      elapsed += 150;
      if (getInjectedWallet()) {
        setWalletStatus('ready');
        window.clearInterval(timer);
      } else if (elapsed >= 4_500) {
        setWalletStatus('missing');
        window.clearInterval(timer);
      }
    }, 150);
    return () => window.clearInterval(timer);
  }, []);

  const connect = useCallback(async () => {
    setWalletStatus('connecting');
    setError(null);
    try {
      const connected = await connectToWallet(NETWORK_ID);
      const { unshieldedAddress } = await connected.getUnshieldedAddress();
      setWallet(connected);
      setAddress(unshieldedAddress);
      setWalletStatus('connected');
    } catch (cause) {
      setError(friendlyError(cause));
      setWalletStatus(getInjectedWallet() ? 'ready' : 'missing');
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet(null);
    setAddress('');
    setWalletStatus(getInjectedWallet() ? 'ready' : 'missing');
    setNotice('Disconnected from this page. Revoke persistent access from Lace settings if needed.');
  }, []);

  const resolveApi = useCallback((): Promise<KinproofAPI> => {
    setPhase('joining');
    return new Promise((resolve, reject) => {
      const observable = manager.current!.resolve(contractAddress || undefined);
      const subscription = observable.subscribe((deployment) => {
        if (deployment.status === 'deployed') {
          if (!contractAddress) setContractAddress(deployment.api.deployedContractAddress);
          queueMicrotask(() => subscription.unsubscribe());
          resolve(deployment.api);
        } else if (deployment.status === 'failed') {
          queueMicrotask(() => subscription.unsubscribe());
          reject(deployment.error);
        }
      });
    });
  }, [contractAddress]);

  const runCircuit = useCallback(async (action: CircuitAction) => {
    if (!wallet) { await connect(); return; }
    if (action !== 'revoke' && !allReady) {
      setError('Complete all five private checks before generating a proof.');
      return;
    }
    setCurrentAction(action);
    setError(null);
    setNotice(null);
    try {
      const api = await resolveApi();
      setPhase('proving');
      if (action === 'seal') await api.sealPlan(checklist);
      if (action === 'refresh') await api.refreshPlan(checklist);
      if (action === 'revoke') await api.revokePlan();
      setPhase('submitting');
      const nextState = action === 'revoke' ? 'revoked' : 'active';
      setLocalSealState(nextState);
      localStorage.setItem('kinproof-local-seal-state', nextState);
      setPhase('confirmed');
      setNotice(action === 'seal'
        ? 'Your readiness seal is now verifiable without exposing the plan.'
        : action === 'refresh'
          ? 'Your seal was refreshed after all private checks passed again.'
          : 'Your readiness seal is now publicly marked as revoked.');
      window.setTimeout(() => void refresh(), 2_500);
      window.setTimeout(() => setPhase('idle'), 4_000);
    } catch (cause) {
      setError(friendlyError(cause));
      setPhase('idle');
    }
  }, [allReady, checklist, connect, refresh, resolveApi, wallet]);

  const toggleCheck = (key: keyof RecoveryChecklist) => {
    if (isBusy) return;
    setChecklist((current) => ({ ...current, [key]: !current[key] }));
    setNotice(null);
    setError(null);
  };

  const primaryAction: CircuitAction = localSealState === 'active' ? 'refresh' : 'seal';
  const primaryLabel = walletStatus !== 'connected'
    ? 'Connect Lace to continue'
    : localSealState === 'active'
      ? 'Refresh private proof'
      : 'Seal my recovery plan';

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Kinproof home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>Kinproof</span>
        </a>
        <div className="topbar-actions">
          <span className="network-pill"><i /> Midnight Preprod</span>
          {walletStatus === 'connected' ? (
            <button className="wallet-pill" onClick={disconnect} title="Disconnect wallet">
              {truncate(address)} <span>Disconnect</span>
            </button>
          ) : walletStatus === 'missing' ? (
            <a className="wallet-pill missing" href="https://www.lace.io/" target="_blank" rel="noreferrer">Install Lace ↗</a>
          ) : (
            <button className="wallet-pill" onClick={() => void connect()} disabled={walletStatus === 'connecting'}>
              {walletStatus === 'connecting' || walletStatus === 'detecting' ? 'Finding Lace…' : 'Connect Lace'}
            </button>
          )}
        </div>
      </header>

      <main id="top">
        <section className="intro">
          <div className="intro-copy">
            <p className="eyebrow">A private recovery-readiness seal</p>
            <h1>Prove the plan is ready.<br /><em>Keep the plan private.</em></h1>
            <p className="lede">
              Kinproof confirms that every recovery safeguard is in place without publishing
              your backup, devices, trusted people, or instructions.
            </p>
            <div className="privacy-note">
              <span className="privacy-glyph" aria-hidden="true">∴</span>
              <p><strong>Zero details leave this page.</strong> Midnight receives a proof of completion and a one-way seal—not your answers.</p>
            </div>
          </div>

          <div className="proof-console">
            <div className="console-header">
              <div>
                <p className="console-kicker">Private check</p>
                <h2>Recovery readiness</h2>
              </div>
              <span className={`status-stamp ${allReady ? 'ready' : ''}`}>{allReady ? 'Ready to prove' : `${completed} of 5`}</span>
            </div>

            <div className="seal-stage" aria-label={`${completed} of 5 private checks complete`}>
              <div className="seal-orbit" style={{ '--progress': `${completed * 20}%` } as React.CSSProperties}>
                {CHECKS.map((check, index) => (
                  <span
                    key={check.key}
                    className={`orbit-node node-${index + 1} ${checklist[check.key] ? 'complete' : ''}`}
                  />
                ))}
                <div className="seal-core">
                  <span className="seal-number">{completed}</span>
                  <span>private checks</span>
                </div>
              </div>
              <p>Your answers are witness data.<br />They are never written on-chain.</p>
            </div>

            <div className="check-list">
              {CHECKS.map((check, index) => (
                <button
                  className={`check-row ${checklist[check.key] ? 'checked' : ''}`}
                  key={check.key}
                  type="button"
                  aria-pressed={checklist[check.key]}
                  onClick={() => toggleCheck(check.key)}
                >
                  <span className="check-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="check-copy"><strong>{check.title}</strong><small>{check.detail}</small></span>
                  <span className="check-control" aria-hidden="true">{checklist[check.key] ? '✓' : ''}</span>
                </button>
              ))}
            </div>

            {error && <div className="message error-message" role="alert">{error}<button onClick={() => setError(null)}>×</button></div>}
            {notice && <div className="message success-message" role="status">{notice}</div>}

            <div className="console-actions">
              <button
                className="primary-action"
                type="button"
                disabled={isBusy || (walletStatus === 'connected' && !allReady)}
                onClick={() => void runCircuit(primaryAction)}
              >
                <span>{isBusy
                  ? phase === 'joining' ? 'Joining contract…'
                    : phase === 'proving' ? 'Generating zero-knowledge proof…'
                      : 'Confirming on Preprod…'
                  : primaryLabel}</span>
                <b aria-hidden="true">→</b>
              </button>
              {localSealState === 'active' && (
                <button className="revoke-action" onClick={() => void runCircuit('revoke')} disabled={isBusy}>Revoke seal</button>
              )}
            </div>
          </div>
        </section>

        <section className="public-record" aria-labelledby="public-record-title">
          <div className="record-heading">
            <p className="eyebrow">What the network can see</p>
            <h2 id="public-record-title">A small public signal.<br />A large private boundary.</h2>
          </div>
          <div className="record-grid">
            <article><span>Active seals</span><strong>{stateLoading ? '—' : publicState.seals.filter((seal) => seal.active).length}</strong><small>Pseudonymous commitments only</small></article>
            <article><span>Plans sealed</span><strong>{stateLoading ? '—' : publicState.sealCount}</strong><small>No wallet address recorded</small></article>
            <article><span>Private rechecks</span><strong>{stateLoading ? '—' : publicState.refreshCount}</strong><small>Answers remain witness data</small></article>
          </div>
          <div className="contract-strip">
            <span><i /> Contract</span>
            <code>{contractAddress ? truncate(contractAddress, 18, 14) : 'Deploying to Preprod next'}</code>
            {contractAddress && <button onClick={() => void navigator.clipboard.writeText(contractAddress)}>Copy address</button>}
          </div>
          {stateError && contractAddress && <p className="indexer-note">Indexer status: {stateError}</p>}
        </section>

        <section className="boundary">
          <div>
            <p className="eyebrow">Privacy model</p>
            <h2>The proof says “all five.”<br />It never says what or where.</h2>
          </div>
          <div className="boundary-columns">
            <article className="observer-card">
              <span>Public observer</span>
              <ul><li>Sees an app-specific commitment</li><li>Sees active or revoked status</li><li>Sees the proof revision</li></ul>
            </article>
            <article className="private-card">
              <span>Only you</span>
              <ul><li>Know the five checklist answers</li><li>Know people, devices, and locations</li><li>Hold the browser-local control secret</li></ul>
            </article>
          </div>
        </section>
      </main>

      <footer>
        <span>Kinproof / Midnight Preprod</span>
        <p>Preparedness without exposure.</p>
        <a href="https://github.com/arko05roy/kinproof" target="_blank" rel="noreferrer">Source ↗</a>
      </footer>
    </div>
  );
}
