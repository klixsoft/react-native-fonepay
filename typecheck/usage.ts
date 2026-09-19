import { useFonepay, type FonepaySession, type PaymentFlowError } from '../src';

export function typed(session: FonepaySession) {
  const fonepay = useFonepay({
    initiate: async () => session,
    verify: async () => 'pending',
    onError: (error: PaymentFlowError) => error.code,
  });

  const status: 'idle' | 'initiating' | 'awaiting' | 'success' | 'failed' = fonepay.status;
  const error: PaymentFlowError | null = fonepay.error;
  return [status, error];
}

// @ts-expect-error `banks` is required on a session
export const invalid: FonepaySession = { qrString: 'x' };
