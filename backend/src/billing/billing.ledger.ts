export const BILLING_LEDGER = Symbol('BILLING_LEDGER');

export interface BillingCredit {
  stripeEventId: string;
  stripeSessionId: string;
  firebaseUid: string;
  coins: number;
  packId: string;
}

export interface BillingLedger {
  /**
   * Returns true if this session was recorded (caller should credit).
   * Returns false if the session was already processed (no double credit).
   */
  recordIfNew(credit: BillingCredit): Promise<boolean>;
  /** Drop a reservation so Stripe can retry after a failed credit. */
  forget(stripeSessionId: string): Promise<void>;
}

export class MemoryBillingLedger implements BillingLedger {
  private readonly sessions = new Set<string>();
  private readonly events = new Set<string>();

  recordIfNew(credit: BillingCredit): Promise<boolean> {
    if (
      this.sessions.has(credit.stripeSessionId) ||
      this.events.has(credit.stripeEventId)
    ) {
      return Promise.resolve(false);
    }
    this.sessions.add(credit.stripeSessionId);
    this.events.add(credit.stripeEventId);
    return Promise.resolve(true);
  }

  forget(stripeSessionId: string): Promise<void> {
    this.sessions.delete(stripeSessionId);
    return Promise.resolve();
  }
}
