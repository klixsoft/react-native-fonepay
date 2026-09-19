# Security

1. **Private key and credentials stay on the server.** Signing requires the RSA private key; a key in
   the app can be extracted and used to create payments as you.
2. **Websocket messages are hints.** Anyone can craft one. The watcher only uses them to trigger
   your server's check.
3. **Only Fonepay's status API proves payment.** Your `verify` endpoint must call it and compare the
   amount and merchant reference (`prn`) with the order.
4. **Make fulfilment idempotent.** The status endpoint is polled repeatedly and a callback may also
   arrive; grant access once.
5. **Authenticate the status endpoint** and scope it to the order's owner so users cannot probe
   other people's orders.
6. **Deep links are handed to a third-party app.** The QR payload is not secret, but do not put
   anything sensitive in it.
7. Use the development domain and test credentials outside production, and keep live keys out of
   source control and logs.
