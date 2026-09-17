export interface CoinPack {
  id: string;
  stripePriceId: string;
  coins: number;
  name: string;
  description: string;
  popular: boolean;
  amountCents: number;
  currency: string;
}

/** Shown on /billing even before Stripe keys are added. Amounts match Stripe Prices. */
export const DEFAULT_COIN_PACKS: Omit<CoinPack, 'stripePriceId'>[] = [
  {
    id: 'starter',
    coins: 50,
    name: 'Starter',
    description: 'About 5 resume analyses or job matches.',
    popular: false,
    amountCents: 499,
    currency: 'usd',
  },
  {
    id: 'plus',
    coins: 200,
    name: 'Plus',
    description: 'About 20 runs — best while you are actively applying.',
    popular: true,
    amountCents: 1400,
    currency: 'usd',
  },
  {
    id: 'pro',
    coins: 500,
    name: 'Pro',
    description: 'A larger balance for teams or a long search.',
    popular: false,
    amountCents: 2999,
    currency: 'usd',
  },
];

/**
 * Parses `id:priceId:coins,...` from STRIPE_COIN_PACKS.
 */
export function parseCoinPacks(raw: string | undefined): CoinPack[] {
  if (!raw?.trim()) return [];
  const packs: CoinPack[] = [];
  for (const part of raw.split(',')) {
    const [id, stripePriceId, coinsRaw] = part.trim().split(':');
    const coins = Number(coinsRaw);
    if (!id || !stripePriceId || !Number.isInteger(coins) || coins <= 0) {
      throw new Error(
        `Invalid STRIPE_COIN_PACKS entry "${part.trim()}". Expected id:priceId:coins`,
      );
    }
    const meta = DEFAULT_COIN_PACKS.find((row) => row.id === id);
    packs.push({
      id,
      stripePriceId,
      coins,
      name: meta?.name ?? titleCase(id),
      description: meta?.description ?? `${coins} coins for resume and job-match runs.`,
      popular: meta?.popular ?? false,
      amountCents: meta?.amountCents ?? 0,
      currency: meta?.currency ?? 'usd',
    });
  }
  return packs;
}

export function catalogPacks(): CoinPack[] {
  return DEFAULT_COIN_PACKS.map((row) => ({ ...row, stripePriceId: '' }));
}

function titleCase(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}
