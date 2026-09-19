# API reference

## Generic payment flow

Exported by every Klixsoft payment package with identical behaviour.

```ts
type PaymentState = 'success' | 'failed' | 'pending';
type PaymentOutcome = 'success' | 'failed' | 'cancelled' | 'timeout';
type PaymentStatus = 'idle' | 'initiating' | 'presenting' | 'verifying' | PaymentOutcome;
```

### `runPaymentFlow(options): Promise<{ outcome, initiation? }>`

| Option | Type | Notes |
| --- | --- | --- |
| `initiate` | `() => Promise<T>` | Ask your server to create the payment. |
| `present` | `(initiation: T) => Promise<unknown>` | Hand it to the gateway. |
| `verify` | `() => Promise<PaymentState>` | Ask your server for the real state. Optional: without it the flow uses the `PaymentState` returned by `present`, and raises `E_NO_VERIFY` if there is none. |
| `isCancelled` | `(error) => boolean` | Marks a `present` error as "user backed out" so the flow ends `cancelled`. |
| `intervalMs` | `number` | Poll delay. Default 3000. |
| `timeoutMs` | `number` | Give up waiting after this long. Default 120000. |
| `maxVerifyErrors` | `number` | Consecutive `verify` failures before the flow rejects. Default 3. |
| `signal` | `{ aborted: boolean }` | Set `aborted = true` to stop; the flow ends `cancelled`. |
| `onStatus` | `(status) => void` | Called on every step change. |
| `onSuccess` | `(initiation) => void` | Called once when the payment succeeded. |
| `onCancel` | `(initiation?) => void` | Called once when the user backed out or stopped waiting. |
| `onError` | `(error, initiation?) => void` | Called once on failure or timeout (a `PaymentFlowError`) or when a step threw. When set, thrown errors resolve `failed` with `result.error` instead of rejecting. |

Errors from `initiate` and non-cancel errors from `present` reject. A server `failed` resolves `failed`; a payment still pending at `timeoutMs` resolves `timeout`.

### `usePaymentFlow(options)`

The same as a hook. Returns `{ start, cancel, reset, status, isProcessing, error }`. `start()` resolves with the result, or `undefined` if it failed (see `error`). The latest options are always used and a running flow is aborted on unmount.

### `pollPaymentState(check, options?)`

Calls `check` every `intervalMs` until it returns `success` or `failed`. Rejects `PaymentFlowError` `E_TIMEOUT` or `E_ABORTED`; errors from `check` propagate.

### Result types

`PaymentFlowResult<T>` is `PaymentSucceeded<T>` (`outcome: 'success'`, `initiation: T`) | `PaymentCancelled<T>` (`'cancelled'`) | `PaymentFailed<T>` (`'failed'`, `error`) | `PaymentTimedOut<T>` (`'timeout'`, `error`). `initiation` is optional except on success, because a flow can end before `initiate` returns; `error` is always present on `failed` and `timeout`.

### `PaymentFlowError`

`code` is `E_INITIATE_FAILED`, `E_PRESENT_FAILED`, `E_VERIFY_FAILED`, `E_PAYMENT_FAILED`, `E_TIMEOUT`, `E_ABORTED` or `E_NO_VERIFY`. `step` is `'initiate' | 'present' | 'verify' | null` and `cause` is the original error. Also exported: `isPaymentFlowError(value)` and `toPaymentFlowError(error, code, step?)`.

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
type FonepaySocketHint = 'success' | 'declined' | 'unknown';
```

## `useFonepay(options): UseFonepayResult`

The whole lifecycle as a hook: `initiate` -> the user picks a bank -> `verify` until settled.

| Option | Notes |
| --- | --- |
| `initiate` | `() => Promise<FonepaySession>`: ask your server to create the QR. |
| `verify` | `() => Promise<PaymentState>`: ask **your server**. |
| `onSuccess` / `onFailure` | Called once when `verify` settles the payment. |
| `autoStart` | Call `initiate` on mount. Default `false`. |
| `pollIntervalMs` | Default 5000. |

Returns:

| Field | Meaning |
| --- | --- |
| `status` | `idle`, `initiating`, `awaiting`, `success` or `failed`. |
| `session` | The `FonepaySession`, once initiated. |
| `banks`, `search`, `setSearch` | The bank list filtered by the search text. |
| `start()` | Runs `initiate` and starts watching. |
| `selectBank(bank)` | Opens the bank app. Sets `message` if it cannot open. |
| `check()` / `checking` | Verify now, for a "Check payment status" button. |
| `message` | A user-facing status line (empty when nothing to say). |
| `error` | The error that stopped `initiate`. |
| `reset()` | Stop watching and return to `idle`. |

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
