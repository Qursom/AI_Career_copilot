import { BadRequestException } from '@nestjs/common';
import { catalogPacks, parseCoinPacks } from './coin-packs';
import { MemoryBillingLedger } from './billing.ledger';
import { BillingService } from './billing.service';
import type { UsersService } from '../users/users.service';
import type { TypedConfigService } from '../config/typed-config.service';

describe('parseCoinPacks', () => {
  it('parses id:price:coins lists', () => {
    expect(parseCoinPacks('starter:price_a:50,plus:price_b:200')).toEqual([
      {
        id: 'starter',
        stripePriceId: 'price_a',
        coins: 50,
        name: 'Starter',
        description: 'About 5 resume analyses or job matches.',
        popular: false,
      },
      {
        id: 'plus',
        stripePriceId: 'price_b',
        coins: 200,
        name: 'Plus',
        description: 'About 20 runs — best while you are actively applying.',
        popular: true,
      },
    ]);
  });

  it('rejects malformed entries', () => {
    expect(() => parseCoinPacks('starter:price_a:nope')).toThrow(
      /Invalid STRIPE_COIN_PACKS/,
    );
  });
});

describe('MemoryBillingLedger', () => {
  it('credits a session only once', async () => {
    const ledger = new MemoryBillingLedger();
    const row = {
      stripeEventId: 'evt_1',
      stripeSessionId: 'cs_1',
      firebaseUid: 'uid-1',
      coins: 50,
      packId: 'starter',
    };
    await expect(ledger.recordIfNew(row)).resolves.toBe(true);
    await expect(ledger.recordIfNew({ ...row, stripeEventId: 'evt_2' })).resolves.toBe(
      false,
    );
  });
});

describe('BillingService.packs', () => {
  it('returns the catalog with checkout disabled when Stripe is unset', () => {
    const config = { get: () => undefined };
    const service = new BillingService(
      config as unknown as TypedConfigService,
      { creditCoins: jest.fn() } as unknown as UsersService,
      new MemoryBillingLedger(),
    );
    expect(service.packs()).toEqual({
      enabled: false,
      packs: catalogPacks(),
    });
  });
});

describe('BillingService.handleWebhook', () => {
  it('rejects a missing signature without calling Stripe', async () => {
    const config = {
      get: (key: string) =>
        key === 'STRIPE_WEBHOOK_SECRET' ? 'whsec_test' : undefined,
    };
    const users = { creditCoins: jest.fn() };
    const service = new BillingService(
      config as unknown as TypedConfigService,
      users as unknown as UsersService,
      new MemoryBillingLedger(),
    );

    await expect(
      service.handleWebhook(Buffer.from('{}'), undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(users.creditCoins).not.toHaveBeenCalled();
  });
});
