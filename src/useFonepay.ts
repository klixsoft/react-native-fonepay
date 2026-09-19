import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { filterBanks } from './banks';
import { FonepayError } from './errors';
import { PaymentFlowErrorCode, toPaymentFlowError } from './flow';
import type { PaymentFlowError, PaymentState } from './flow';
import { openBank } from './openBank';
import type { FonepayBank, FonepaySession } from './types';
import { createFonepayWatcher } from './watcher';

/** Where a Fonepay payment is. `awaiting` means the bank list is showing and the payment is being watched. */
export type FonepayStatus = 'idle' | 'initiating' | 'awaiting' | 'success' | 'failed';

export interface UseFonepayOptions {
  /** Step 1. Ask your server to create the Fonepay Intent QR and return the session. */
  initiate: () => Promise<FonepaySession>;
  /** Step 3. Ask your server whether the payment finished. It must consult Fonepay's status API. */
  verify: () => Promise<PaymentState>;
  onSuccess?: () => void;
  onFailure?: () => void;
  /** Called when `initiate` throws, with a `PaymentFlowError` (`E_INITIATE_FAILED`, `cause` = the original error). */
  onError?: (error: PaymentFlowError) => void;
  /** Calls `initiate` on mount instead of waiting for `start()`. */
  autoStart?: boolean;
  /** Poll period. Defaults to 5000 ms. */
  pollIntervalMs?: number;
}

export interface UseFonepayResult {
  status: FonepayStatus;
  session: FonepaySession | null;
  /** The session's banks, filtered by `search`. */
  banks: FonepayBank[];
  search: string;
  setSearch: (value: string) => void;
  /** Runs `initiate` and starts watching the payment. */
  start: () => Promise<void>;
  /** Step 2. Opens the chosen bank's app on the payment. Sets `message` when it cannot open. */
  selectBank: (bank: FonepayBank) => Promise<void>;
  /** Verifies now, for a "Check payment status" button. */
  check: () => Promise<void>;
  checking: boolean;
  /** A user-facing status line, empty when there is nothing to say. */
  message: string;
  /** The error that stopped `initiate`, or `null`. */
  error: PaymentFlowError | null;
  /** Stops watching and returns to `idle`. */
  reset: () => void;
}

/**
 * The complete Fonepay lifecycle in one hook: `start()` initiates, the user picks a bank with
 * `selectBank`, and the payment is watched (websocket, foreground, polling) until your server's
 * `verify` says it settled. Watching stops on unmount.
 */
export function useFonepay(options: UseFonepayOptions): UseFonepayResult {
  const [status, setStatus] = useState<FonepayStatus>('idle');
  const [session, setSession] = useState<FonepaySession | null>(null);
  const [search, setSearch] = useState<string>('');
  const [checking, setChecking] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<PaymentFlowError | null>(null);

  const latest = useRef(options);
  const running = useRef(false);
  latest.current = options;

  const watcher = useMemo(() => {
    if (!session) return null;
    return createFonepayWatcher({
      websocketUrl: session.websocketUrl,
      pollIntervalMs: options.pollIntervalMs,
      verify: () => latest.current.verify(),
      onSuccess: () => {
        setStatus('success');
        latest.current.onSuccess?.();
      },
      onFailure: () => {
        setStatus('failed');
        setMessage('The payment failed.');
        latest.current.onFailure?.();
      },
      onHint: (hint) => {
        if (hint === 'declined') setMessage('Payment was declined or cancelled.');
      },
    });
  }, [session, options.pollIntervalMs]);

  useEffect(() => {
    if (!watcher) return undefined;
    watcher.start();
    return () => watcher.stop();
  }, [watcher]);

  const start = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setError(null);
    setMessage('');
    setStatus('initiating');
    try {
      setSession(await latest.current.initiate());
      setStatus('awaiting');
    } catch (caught) {
      const flowError = toPaymentFlowError(caught, PaymentFlowErrorCode.InitiateFailed, 'initiate');
      setError(flowError);
      setStatus('failed');
      latest.current.onError?.(flowError);
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    if (options.autoStart) void start();
  }, [options.autoStart, start]);

  const selectBank = useCallback(
    async (bank: FonepayBank) => {
      if (!session) return;
      setMessage('');
      try {
        await openBank(bank, session.qrString);
      } catch (caught) {
        setMessage(caught instanceof FonepayError ? caught.message : `Could not open ${bank.bankName}.`);
      }
    },
    [session]
  );

  const check = useCallback(async () => {
    if (!watcher) return;
    setChecking(true);
    try {
      const state = await watcher.check();
      if (state === 'pending') setMessage('Payment not completed yet. Finish in your banking app.');
      if (state === 'error') setMessage('Could not verify payment. Please try again.');
    } finally {
      setChecking(false);
    }
  }, [watcher]);

  const reset = useCallback(() => {
    setSession(null);
    setStatus('idle');
    setSearch('');
    setMessage('');
    setError(null);
  }, []);

  const banks = useMemo(() => filterBanks(session?.banks ?? [], search), [session, search]);

  return { status, session, banks, search, setSearch, start, selectBank, check, checking, message, error, reset };
}
