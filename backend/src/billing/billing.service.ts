import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type Stripe from 'stripe';
import { TypedConfigService } from '../config/typed-config.service';
import { UsersService } from '../users/users.service';
import { parseCoinPacks, catalogPacks, type CoinPack } from './coin-packs';
import { BILLING_LEDGER, type BillingLedger } from './billing.ledger';

export interface PacksResponse {
  enabled: boolean;
  packs: CoinPack[];
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripe: Stripe | null = null;

  constructor(
    private readonly config: TypedConfigService,
    private readonly users: UsersService,
    @Inject(BILLING_LEDGER) private readonly ledger: BillingLedger,
  ) {}

  packs(): PacksResponse {
    const configured = this.safePacks();
    const packs = configured.length > 0 ? configured : catalogPacks();
    const secret = this.config.get('STRIPE_SECRET_KEY');
    const livePrices = configured.some((pack) => pack.stripePriceId.startsWith('price_'));
    return {
      enabled: Boolean(secret) && livePrices,
      packs: packs.map((pack) => ({
        ...pack,
        stripePriceId: livePrices ? pack.stripePriceId : '',
      })),
    };
  }

  async createCheckoutSession(
    firebaseUid: string,
    packId: string,
  ): Promise<{ url: string }> {
    const stripe = await this.client();
    const pack = this.safePacks().find((p) => p.id === packId);
    if (!pack?.stripePriceId) {
      throw new BadRequestException({
        code: 'UNKNOWN_PACK',
        message: `Unknown coin pack "${packId}".`,
      });
    }

    const frontend = this.config.get('FRONTEND_URL').replace(/\/$/, '');
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: pack.stripePriceId, quantity: 1 }],
      client_reference_id: firebaseUid,
      metadata: {
        firebaseUid,
        coins: String(pack.coins),
        packId: pack.id,
      },
      success_url: `${frontend}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontend}/billing?canceled=1`,
    });

    if (!session.url) {
      throw new ServiceUnavailableException({
        code: 'BILLING_ERROR',
        message: 'Stripe did not return a checkout URL.',
      });
    }
    return { url: session.url };
  }

  async handleWebhook(rawBody: Buffer, signature: string | undefined): Promise<{
    received: true;
  }> {
    const secret = this.config.get('STRIPE_WEBHOOK_SECRET');
    if (!secret) {
      throw new ServiceUnavailableException({
        code: 'BILLING_DISABLED',
        message: 'Stripe webhooks are not configured.',
      });
    }
    if (!signature) {
      throw new BadRequestException({
        code: 'MISSING_SIGNATURE',
        message: 'Missing Stripe-Signature header.',
      });
    }

    const stripe = await this.client();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch {
      throw new BadRequestException({
        code: 'INVALID_SIGNATURE',
        message: 'Stripe webhook signature was rejected.',
      });
    }

    if (event.type !== 'checkout.session.completed') {
      return { received: true };
    }

    const session = event.data.object;
    const firebaseUid =
      session.metadata?.firebaseUid || session.client_reference_id || '';
    const coins = Number(session.metadata?.coins);
    const packId = session.metadata?.packId || 'unknown';
    if (!firebaseUid || !Number.isInteger(coins) || coins <= 0) {
      this.logger.warn(
        `Ignoring checkout session ${session.id}: missing firebaseUid or coins`,
      );
      return { received: true };
    }

    const isNew = await this.ledger.recordIfNew({
      stripeEventId: event.id,
      stripeSessionId: session.id,
      firebaseUid,
      coins,
      packId,
    });
    if (!isNew) {
      this.logger.log(`Duplicate Stripe event ${event.id}; skipping credit`);
      return { received: true };
    }

    try {
      await this.users.creditCoins(firebaseUid, coins);
    } catch (err) {
      await this.ledger.forget(session.id);
      throw err;
    }
    this.logger.log(
      `Credited ${coins} coins to ${firebaseUid} from session ${session.id}`,
    );
    return { received: true };
  }

  private safePacks(): CoinPack[] {
    try {
      return parseCoinPacks(this.config.get('STRIPE_COIN_PACKS'));
    } catch (err) {
      this.logger.error(
        err instanceof Error ? err.message : String(err),
      );
      return [];
    }
  }

  private async client(): Promise<Stripe> {
    const key = this.config.get('STRIPE_SECRET_KEY');
    if (!key) {
      throw new ServiceUnavailableException({
        code: 'BILLING_DISABLED',
        message: 'Coin purchases are not configured on this deployment.',
      });
    }
    if (!this.stripe) {
      const StripeSdk = (await import('stripe')).default;
      this.stripe = new StripeSdk(key) as unknown as Stripe;
    }
    return this.stripe;
  }
}
