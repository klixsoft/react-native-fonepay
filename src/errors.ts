import { isPaymentFlowError } from './flow';
import type { PaymentFlowError } from './flow';

export const FonepayErrorCode = {
  /** The bank app could not be opened (usually not installed). */
  OpenFailed: 'E_OPEN_FAILED',
  /** A required value was empty. */
  InvalidArguments: 'E_INVALID_ARGUMENTS',
} as const;

export type FonepayErrorCodeValue = (typeof FonepayErrorCode)[keyof typeof FonepayErrorCode];

export class FonepayError extends Error {
  override readonly name = 'FonepayError';
  readonly code: FonepayErrorCodeValue;

  constructor(code: FonepayErrorCodeValue, message: string) {
    super(message);
    this.code = code;
  }
}

/** Type guard for {@link FonepayError}. */
export function isFonepayError(error: unknown): error is FonepayError {
  return error instanceof FonepayError;
}

/**
 * The Fonepay error behind a flow error, when the failure came from the Fonepay step (its `cause`).
 * Use it to branch on Fonepay-specific `code`s after `runPaymentFlow`, `use...Payment` or `onError`.
 */
export function getFonepayError(error: PaymentFlowError | null | undefined): FonepayError | undefined {
  return isPaymentFlowError(error) && error.cause instanceof FonepayError ? error.cause : undefined;
}
