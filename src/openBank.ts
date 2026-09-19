import { Linking } from 'react-native';

import { buildBankDeepLink } from './banks';
import { FonepayError, FonepayErrorCode } from './errors';
import type { FonepayBank } from './types';

/**
 * Opens the chosen bank's app on the payment. Rejects with `E_OPEN_FAILED` when the app cannot
 * handle the link, which normally means it is not installed.
 */
export async function openBank(bank: FonepayBank, qrString: string): Promise<void> {
  const url = buildBankDeepLink(bank, qrString);
  try {
    await Linking.openURL(url);
  } catch {
    throw new FonepayError(FonepayErrorCode.OpenFailed, `Could not open ${bank.bankName}. Is the app installed?`);
  }
}
