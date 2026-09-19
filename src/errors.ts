export const FonepayErrorCode = {
  /** The bank app could not be opened (usually not installed). */
  OpenFailed: 'E_OPEN_FAILED',
  /** A required value was empty. */
  InvalidArguments: 'E_INVALID_ARGUMENTS',
} as const;

export type FonepayErrorCodeValue = (typeof FonepayErrorCode)[keyof typeof FonepayErrorCode];

export class FonepayError extends Error {
  readonly code: FonepayErrorCodeValue;

  constructor(code: FonepayErrorCodeValue, message: string) {
    super(message);
    this.name = 'FonepayError';
    this.code = code;
  }
}
