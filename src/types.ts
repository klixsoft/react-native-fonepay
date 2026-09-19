/** A bank or wallet that can complete a Fonepay Intent payment. */
export interface FonepayBank {
  bankCode: string;
  bankName: string;
  /** Deep link scheme of the bank's app, for example `https://bank.example/pay` or `bankapp:/`. */
  intentScheme: string;
  bankIcon?: string;
}

/** What your server returns after creating the Fonepay Intent QR. */
export interface FonepaySession {
  /** The QR / intent payload the bank app reads. */
  qrString: string;
  /** Fonepay's websocket for live status. Optional: polling alone works. */
  websocketUrl?: string;
  banks: FonepayBank[];
}

/** What your server reports after checking Fonepay's authoritative status API. */
export type FonepayPaymentState = 'success' | 'failed' | 'pending';

/** A hint pushed over the websocket. It is only a trigger, never proof. */
export type FonepaySocketHint = 'success' | 'declined' | 'unknown';
