import { FonepayError, FonepayErrorCode } from './errors';
import type { FonepayBank } from './types';

/**
 * Builds the deep link that opens a bank app on the payment: `<intentScheme>/?qrPayload=<encoded qr>`.
 * Trailing slashes on the scheme are normalised.
 */
export function buildBankDeepLink(bank: Pick<FonepayBank, 'intentScheme'>, qrString: string): string {
  const scheme = bank.intentScheme?.trim().replace(/\/+$/, '');
  if (!scheme) throw new FonepayError(FonepayErrorCode.InvalidArguments, 'The bank has no `intentScheme`.');
  if (!qrString) throw new FonepayError(FonepayErrorCode.InvalidArguments, '`qrString` is empty.');
  return `${scheme}/?qrPayload=${encodeURIComponent(qrString)}`;
}

/** Case-insensitive search over bank names. An empty query returns every bank. */
export function filterBanks<T extends Pick<FonepayBank, 'bankName'>>(banks: readonly T[], query: string): T[] {
  const needle = query.trim().toLowerCase();
  return needle ? banks.filter((bank) => bank.bankName.toLowerCase().includes(needle)) : [...banks];
}
