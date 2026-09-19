# @klixsoft/react-native-fonepay

Accept [Fonepay](https://fonepay.com) **Intent** payments in React Native: the user picks their
bank or wallet, your app deep-links into that banking app, they approve, and you confirm the result.
No WebView, and no native code to link, so it also works in Expo.

Fonepay publishes no React Native package and no mobile SDK for this flow. Payment happens **inside
the bank's own app**; what an app needs is (1) the right deep link, (2) a reliable way to notice
the payment finished. That is exactly what this library does.

- `buildBankDeepLink` / `openBank`: `<intentScheme>/?qrPayload=<QR>` for the chosen bank
- `createFonepayWatcher`: websocket push, foreground re-check and polling, all ending in one verification call
- `useFonepay`: search, open bank and watch the payment in one hook
- Pure TypeScript, typed, tree-shakeable, tested with Node's built-in runner

> **Security in one line:** Fonepay requests are signed with your **private key on the server**. The
> app only displays banks and opens a link. A websocket "success" message is a *hint*; only your
> server's call to Fonepay's status API proves payment. See [docs/security.md](docs/security.md).

## Requirements

React Native 0.70+ (any architecture) or Expo. Android and iOS.

## Installation

```sh
pnpm add @klixsoft/react-native-fonepay     # or npm / yarn
```

### iOS

Opening a bank app needs no extra configuration. If you also want to *check* whether a bank app is
installed with `Linking.canOpenURL`, add each bank's scheme to `LSApplicationQueriesSchemes`. That is
optional; `openBank` simply reports `E_OPEN_FAILED` when the app cannot be opened.

### Android

Opening deep links works as-is. On Android 11+ `Linking.canOpenURL` needs `<queries>` entries;
`openBank` does not.

## How a payment works

```
 App                         Your server                          Fonepay
  | 1. "buy this" ---------> |                                       |
  |                          | 2. login, list banks, create QR (signed)
  |                          | ------------------------------------> |
  | <-- qrString, banks,     |                                       |
  |     websocketUrl ------- |                                       |
  | 3. user picks a bank;    |                                       |
  |    app opens bank app  --------- qrPayload deep link ----------> bank app
  | 4. websocket / poll / foreground -> "did it succeed?" -> server asks Fonepay's status API
  | <------ success | failed |                                       |
```

Steps 2 and 4 are yours: see [docs/backend-integration.md](docs/backend-integration.md).

## Usage

```tsx
import { useFonepay, type FonepaySession } from '@klixsoft/react-native-fonepay';

function FonepayPicker({ session, orderId, onPaid }: { session: FonepaySession; orderId: string; onPaid: () => void }) {
  const { banks, search, setSearch, pay, check, checking, message } = useFonepay({
    session,
    verify: async () => (await api.get(`/payments/${orderId}/status`)).status,
    onSuccess: onPaid,
  });

  return (
    <View>
      <TextInput value={search} onChangeText={setSearch} placeholder="Search bank or wallet" />
      {message ? <Text>{message}</Text> : null}
      {banks.map((bank) => (
        <Pressable key={bank.bankCode} onPress={() => pay(bank)}>
          <Text>{bank.bankName}</Text>
        </Pressable>
      ))}
      <Button title={checking ? 'Checking...' : 'Check payment status'} onPress={check} />
    </View>
  );
}
```

`session` is exactly what your server returns after creating the QR: `{ qrString, websocketUrl?, banks }`
with each bank `{ bankCode, bankName, intentScheme, bankIcon? }`.

### Without the hook

```ts
const watcher = createFonepayWatcher({
  websocketUrl: session.websocketUrl,
  verify: () => fetchStatusFromYourServer(),
  onSuccess: () => navigation.replace('Success'),
});
watcher.start();
await openBank(bank, session.qrString);
// later
watcher.stop();
```

## API

See [docs/api-reference.md](docs/api-reference.md).

## Documentation

- [Backend integration](docs/backend-integration.md)
- [API reference](docs/api-reference.md)
- [Security](docs/security.md)
- [Troubleshooting](docs/troubleshooting.md)

## Disclaimer

Independent community library, not affiliated with or endorsed by Fonepay.

## License

MIT © Klixsoft
