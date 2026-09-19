import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { filterBanks } from './banks';
import { FonepayError } from './errors';
import { openBank } from './openBank';
import type { FonepayBank, FonepayPaymentState, FonepaySession } from './types';
import { createFonepayWatcher } from './watcher';

export interface UseFonepayOptions {
  session: FonepaySession;
  /** Asks your server (which asks Fonepay) whether the payment finished. */
  verify: () => Promise<FonepayPaymentState>;
  onSuccess: () => void;
  onFailure?: () => void;
  pollIntervalMs?: number;
}

export interface UseFonepayResult {
  banks: FonepayBank[];
  search: string;
  setSearch: (value: string) => void;
  /** Opens the bank app. Sets `message` when it cannot be opened. */
  pay: (bank: FonepayBank) => Promise<void>;
  /** Verifies now, for a "Check payment status" button. */
  check: () => Promise<void>;
  checking: boolean;
  /** A user-facing status line, empty when there is nothing to say. */
  message: string;
}

/**
 * Everything a Fonepay bank picker needs: search, opening the bank app and watching the payment
 * (websocket + foreground + polling) until your server confirms it. Watching stops on unmount.
 */
export function useFonepay(options: UseFonepayOptions): UseFonepayResult {
  const { session, verify, onSuccess, onFailure, pollIntervalMs } = options;
  const [search, setSearch] = useState<string>('');
  const [checking, setChecking] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  const latest = useRef({ verify, onSuccess, onFailure });
  latest.current = { verify, onSuccess, onFailure };

  const watcher = useMemo(
    () =>
      createFonepayWatcher({
        websocketUrl: session.websocketUrl,
        pollIntervalMs,
        verify: () => latest.current.verify(),
        onSuccess: () => latest.current.onSuccess(),
        onFailure: () => {
          setMessage('The payment failed.');
          latest.current.onFailure?.();
        },
        onHint: (hint) => {
          if (hint === 'declined') setMessage('Payment was declined or cancelled.');
        },
      }),
    [session.websocketUrl, pollIntervalMs]
  );

  useEffect(() => {
    watcher.start();
    return () => watcher.stop();
  }, [watcher]);

  const banks = useMemo(() => filterBanks(session.banks, search), [session.banks, search]);

  const pay = useCallback(
    async (bank: FonepayBank) => {
      setMessage('');
      try {
        await openBank(bank, session.qrString);
      } catch (error) {
        setMessage(error instanceof FonepayError ? error.message : `Could not open ${bank.bankName}.`);
      }
    },
    [session.qrString]
  );

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const state = await watcher.check();
      if (state === 'pending') setMessage('Payment not completed yet. Finish in your banking app.');
      if (state === 'error') setMessage('Could not verify payment. Please try again.');
    } finally {
      setChecking(false);
    }
  }, [watcher]);

  return { banks, search, setSearch, pay, check, checking, message };
}
