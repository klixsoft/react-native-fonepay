import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildBankDeepLink, filterBanks } from '../src/banks.ts';

test('builds the deep link and normalises trailing slashes', () => {
  assert.equal(
    buildBankDeepLink({ intentScheme: 'bankapp://' }, 'a b&c=d'),
    'bankapp:/?qrPayload=a%20b%26c%3Dd'
  );
  assert.equal(
    buildBankDeepLink({ intentScheme: 'https://bank.example/pay/' }, 'QR'),
    'https://bank.example/pay/?qrPayload=QR'
  );
});

test('rejects a missing scheme or empty QR', () => {
  assert.throws(() => buildBankDeepLink({ intentScheme: ' ' }, 'x'), { code: 'E_INVALID_ARGUMENTS' });
  assert.throws(() => buildBankDeepLink({ intentScheme: 'a://' }, ''), { code: 'E_INVALID_ARGUMENTS' });
});

test('filterBanks searches case-insensitively', () => {
  const banks = [{ bankName: 'Nabil Bank' }, { bankName: 'eSewa Wallet' }, { bankName: 'Global IME' }];
  assert.deepEqual(filterBanks(banks, ' NABIL '), [banks[0]]);
  assert.equal(filterBanks(banks, '').length, 3);
  assert.equal(filterBanks(banks, 'zzz').length, 0);
});
