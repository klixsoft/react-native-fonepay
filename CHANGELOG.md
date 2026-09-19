# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [0.1.0-beta.1] - 2026-09-19

### Added
- `useFonepay`: `initiate`, bank selection and `verify` in one hook.
- `createFonepayWatcher`: websocket push, app foreground and polling funnelled into one verification.
- `openBank`, `buildBankDeepLink`, `filterBanks` and `parseSocketMessage`.
- `FonepayError` with stable `FonepayErrorCode` values.
- `onSuccess`, `onCancel` and `onError` callbacks on every flow; `verify` is optional where the gateway SDK reports a trustworthy result.
- Strict typing: results are a discriminated union on `outcome`; every failure is a `PaymentFlowError` with `code`, `step` and `cause`; `is...Error` guards and `get...Error` cause extractors; compile-time type tests.
- Standard payment lifecycle shared by all Klixsoft payment packages: `runPaymentFlow`,
  `usePaymentFlow`, `pollPaymentState` and the `PaymentState` / `PaymentOutcome` / `PaymentStatus` types.
