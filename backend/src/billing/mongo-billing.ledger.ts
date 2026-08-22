import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  BillingEventEntity,
  type BillingEventDocument,
} from './billing-event.schema';
import type { BillingCredit, BillingLedger } from './billing.ledger';

@Injectable()
export class MongoBillingLedger implements BillingLedger {
  constructor(
    @InjectModel(BillingEventEntity.name)
    private readonly model: Model<BillingEventDocument>,
  ) {}

  async recordIfNew(credit: BillingCredit): Promise<boolean> {
    try {
      await this.model.create(credit);
      return true;
    } catch (err) {
      if (isDuplicateKey(err)) return false;
      throw err;
    }
  }

  async forget(stripeSessionId: string): Promise<void> {
    await this.model.deleteOne({ stripeSessionId });
  }
}

function isDuplicateKey(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === 11000
  );
}
