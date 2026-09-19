# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [0.1.0] - Unreleased

### Added
- `useFonepay`: `initiate`, bank selection and `verify` in one hook.
- `createFonepayWatcher`: websocket push, app foreground and polling funnelled into one verification.
- `openBank`, `buildBankDeepLink`, `filterBanks` and `parseSocketMessage`.
- `FonepayError` with stable `FonepayErrorCode` values.
- Standard payment lifecycle shared by all Klixsoft payment packages: `runPaymentFlow`,
  `usePaymentFlow`, `pollPaymentState` and the `PaymentState` / `PaymentOutcome` / `PaymentStatus` types.
