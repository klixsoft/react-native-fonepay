# Troubleshooting

**`E_OPEN_FAILED` when picking a bank**: the bank's app is not installed, or its `intentScheme` is
wrong. Show the message from `useFonepay` (`Could not open <bank>. Is the app installed?`) and let
the user choose another bank or install the app.

**The app never notices the payment**: confirm your status endpoint returns `success` once Fonepay
reports it. The websocket only speeds things up; polling every 5 s and the foreground re-check are
the safety net. Use "Check payment status" (`check()`) to test the endpoint by hand.

**No websocket events**: the session has no `websocketUrl`, the URL expired, or the network blocks
`wss`. Polling still works.

**Status stays `pending`**: the user has not approved in the bank app yet, or the QR expired.
Create a new session.

**`start()` seems to do nothing**: it ignores calls while an `initiate` is already running. Read `error` to see why `initiate` failed, or call `reset()` and try again.

**Signature errors from Fonepay** (server side): sign the exact bytes you send and use the key
matching the environment (development vs production).
