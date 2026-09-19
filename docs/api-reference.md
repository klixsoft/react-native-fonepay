# API reference

```ts
import {
  useFonepay, createFonepayWatcher, openBank, buildBankDeepLink, filterBanks, parseSocketMessage,
  FonepayError, FonepayErrorCode,
} from '@klixsoft/react-native-fonepay';
```

## Types

```ts
interface FonepayBank { bankCode: string; bankName: string; intentScheme: string; bankIcon?: string }
interface FonepaySession { qrString: string; websocketUrl?: string; banks: FonepayBank[] }
type FonepayPaymentState = 'success' | 'failed' | 'pending';
type FonepaySocketHint = 'success' | 'declined' | 'unknown';
```

## `useFonepay(options): UseFonepayResult`

| Option | Notes |
| --- | --- |
| `session` | `FonepaySession` from your server. |
| `verify` | `() => Promise<FonepayPaymentState>`: asks **your server**. |
| `onSuccess` | Called once when `verify` returns `success`. |
| `onFailure` | Called once when `verify` returns `failed`. |
| `pollIntervalMs` | Default 5000. |

Returns `banks` (filtered), `search`, `setSearch`, `pay(bank)`, `check()`, `checking`, `message`.
Watching starts on mount and stops on unmount or after settling.

## `createFonepayWatcher(options): { start, stop, check }`

Websocket push, app-foreground and polling all call `verify`. Concurrent triggers share one
in-flight call, and it settles exactly once. `check()` resolves to `'success' | 'failed' | 'pending' | 'error'`.
Options: `verify`, `websocketUrl?`, `pollIntervalMs?`, `onSuccess`, `onFailure?`, `onHint?`, `onError?`.
A throwing `verify` calls `onError` and watching continues.

## `openBank(bank, qrString): Promise<void>`

Opens the bank app. Rejects with `FonepayError` `E_OPEN_FAILED` if it cannot be opened.

## `buildBankDeepLink(bank, qrString): string`

`<intentScheme without trailing slashes>/?qrPayload=<encodeURIComponent(qrString)>`. Throws
`E_INVALID_ARGUMENTS` if either is empty.

## `filterBanks(banks, query)`

Case-insensitive name search; an empty query returns all banks.

## `parseSocketMessage(raw): FonepaySocketHint`

`transactionStatus` may be an object or JSON string; `paymentSuccess` / `success` `true` gives
`success`, `paymentSuccess: false` gives `declined`, anything else (including bad data) `unknown`.
