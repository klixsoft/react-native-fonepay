import { parseSocketMessage } from './socket';
import type { PaymentState } from './flow';
import type { FonepaySocketHint } from './types';

export interface SocketLike {
  onmessage: ((event: { data: unknown }) => void) | null;
  close(): void;
}

export interface WatcherDeps {
  createSocket: (url: string) => SocketLike;
  /** Calls `listener(true)` when the app becomes active. Returns an unsubscribe function. */
  onForeground: (listener: () => void) => () => void;
  setInterval: (callback: () => void, ms: number) => unknown;
  clearInterval: (handle: unknown) => void;
}

export interface FonepayWatcherOptions {
  /** Asks **your server** whether the payment finished. It must consult Fonepay's status API. */
  verify: () => Promise<PaymentState>;
  websocketUrl?: string;
  /** Poll period. Defaults to 5000 ms. */
  pollIntervalMs?: number;
  onSuccess: () => void;
  /** Called only when the server reports the payment failed. */
  onFailure?: () => void;
  /** Called for websocket hints, for example to show "declined". Never treat as final. */
  onHint?: (hint: FonepaySocketHint) => void;
  /** Called when a check throws. Watching continues. */
  onError?: (error: unknown) => void;
  deps?: Partial<WatcherDeps>;
}

export interface FonepayWatcher {
  start(): void;
  stop(): void;
  /** Runs one verification now (for a "Check payment status" button). */
  check(): Promise<PaymentState | 'error'>;
}

function defaultDeps(): WatcherDeps {
  const { AppState } = require('react-native') as typeof import('react-native');
  return {
    createSocket: (url) => new WebSocket(url) as unknown as SocketLike,
    onForeground: (listener) => {
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') listener();
      });
      return () => subscription.remove();
    },
    setInterval: (callback, ms) => setInterval(callback, ms),
    clearInterval: (handle) => clearInterval(handle as ReturnType<typeof setInterval>),
  };
}

/**
 * Watches a Fonepay payment until it settles. A websocket push, the app returning to the foreground
 * and a fixed poll all call the same `verify`, so a missed push never strands the user. It settles
 * exactly once, then stops itself.
 */
export function createFonepayWatcher(options: FonepayWatcherOptions): FonepayWatcher {
  const provided = options.deps ?? {};
  const complete =
    provided.createSocket && provided.onForeground && provided.setInterval && provided.clearInterval;
  const deps: WatcherDeps = complete ? (provided as WatcherDeps) : { ...defaultDeps(), ...provided };
  const pollIntervalMs = options.pollIntervalMs ?? 5000;

  let settled = false;
  let inFlight: Promise<PaymentState | 'error'> | null = null;
  let socket: SocketLike | null = null;
  let timer: unknown = null;
  let unsubscribeForeground: (() => void) | null = null;
  let running = false;

  const stop = () => {
    running = false;
    if (timer !== null) deps.clearInterval(timer);
    timer = null;
    unsubscribeForeground?.();
    unsubscribeForeground = null;
    if (socket) {
      socket.onmessage = null;
      try {
        socket.close();
      } catch {
        socket = null;
      }
    }
    socket = null;
  };

  const check = (): Promise<PaymentState | 'error'> => {
    if (settled) return Promise.resolve('success');
    if (inFlight) return inFlight;

    inFlight = (async () => {
      try {
        const state = await options.verify();
        if (settled) return state;
        if (state === 'success') {
          settled = true;
          stop();
          options.onSuccess();
        } else if (state === 'failed') {
          settled = true;
          stop();
          options.onFailure?.();
        }
        return state;
      } catch (error) {
        options.onError?.(error);
        return 'error' as const;
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  };

  const start = () => {
    if (running || settled) return;
    running = true;

    if (options.websocketUrl) {
      try {
        socket = deps.createSocket(options.websocketUrl);
        socket.onmessage = (event) => {
          const hint = parseSocketMessage(event.data);
          options.onHint?.(hint);
          if (hint === 'success') void check();
        };
      } catch (error) {
        socket = null;
        options.onError?.(error);
      }
    }

    unsubscribeForeground = deps.onForeground(() => void check());
    timer = deps.setInterval(() => void check(), pollIntervalMs);
  };

  return { start, stop, check };
}
