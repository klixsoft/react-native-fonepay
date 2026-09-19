import type { FonepaySocketHint } from './types';

interface TransactionStatus {
  paymentSuccess?: boolean;
  success?: boolean;
}

function toStatus(value: unknown): TransactionStatus | null {
  if (typeof value === 'string') {
    try {
      return toStatus(JSON.parse(value));
    } catch {
      return null;
    }
  }
  return value !== null && typeof value === 'object' ? (value as TransactionStatus) : null;
}

/**
 * Reads a Fonepay websocket message. `transactionStatus` may be an object or a JSON string.
 * Returns `success` / `declined` when the message says so and `unknown` for anything else,
 * including malformed data. Treat every result as a trigger to verify, not as proof.
 */
export function parseSocketMessage(raw: unknown): FonepaySocketHint {
  let payload: unknown = raw;
  if (typeof raw === 'string') {
    try {
      payload = JSON.parse(raw);
    } catch {
      return 'unknown';
    }
  }
  if (payload === null || typeof payload !== 'object') return 'unknown';

  const status = toStatus((payload as { transactionStatus?: unknown }).transactionStatus);
  if (!status) return 'unknown';
  if (status.paymentSuccess === true || status.success === true) return 'success';
  if (status.paymentSuccess === false) return 'declined';
  return 'unknown';
}
