# Backend integration

Your server talks to Fonepay's third-party **Intent** API. Confirm the exact domain, paths and
credentials in the Fonepay integration documentation you were given; the shape below is what this
library expects.

## What you need from Fonepay

- OAuth `username` / `password`
- A merchant **terminal id**
- An RSA **private key** (PKCS8), whose public key Fonepay holds
- The API domain (a development domain for testing, a production one for live)

Keep every one of these on the server only.

## The four server calls

All requests after login are signed with **SHA256withRSA** over the exact JSON body bytes you send,
base64 encoded into a `signature` header.

1. **Login (OAuth)** to obtain a bearer token. Cache it until shortly before it expires.
2. **Bank list** so the app can show banks and their `intentScheme`.
3. **Create the Intent QR** for your order, returning the QR payload, a merchant reference (`prn`)
   and a websocket URL.
4. **Status lookup**, the authoritative answer to "was this paid".

```python
import base64
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

key = serialization.load_pem_private_key(PRIVATE_KEY_PEM.encode(), password=None)

def sign(body: str) -> str:
    sig = key.sign(body.encode(), padding.PKCS1v15(), hashes.SHA256())
    return base64.b64encode(sig).decode()
```

Sign the string you actually transmit. Re-serialising JSON after signing changes the bytes and
breaks the signature.

## What your API returns to the app

Return the session the hook expects:

```json
{
  "qrString": "<qr payload from Fonepay>",
  "websocketUrl": "wss://...",
  "banks": [
    { "bankCode": "NBL", "bankName": "Nabil Bank", "intentScheme": "nabilmobilebanking:/", "bankIcon": "https://..." }
  ]
}
```

Map Fonepay's field names to these. Only `qrString` and `banks` are required; without
`websocketUrl` the watcher relies on polling and foreground checks.

## The status endpoint the app polls

```
GET /payments/:id/status  ->  { "status": "success" | "failed" | "pending" }
```

Implement it by calling Fonepay's **status lookup** with the order's `prn`, never by trusting the
websocket or anything the client sends. On success, verify the amount and `prn` match the order and
mark the order paid **idempotently** (the status endpoint will be called many times, and a webhook
may also fire).
