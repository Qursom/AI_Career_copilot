import { Logger, Module, type Provider } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { isMongoConfigured } from '../config/mongo-enabled';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import {
  BillingEventEntity,
  BillingEventSchema,
} from './billing-event.schema';
import { BillingController } from './billing.controller';
import { BILLING_LEDGER, MemoryBillingLedger } from './billing.ledger';
import { BillingService } from './billing.service';
import { MongoBillingLedger } from './mongo-billing.ledger';

const mongoOn = isMongoConfigured();

const memoryLedger: Provider = {
  provide: BILLING_LEDGER,
  useFactory: () => {
    new Logger('BillingModule').warn(
      'MONGODB_URI unset; Stripe credits use an in-memory ledger (lost on restart)',
    );
    return new MemoryBillingLedger();
  },
};

@Module({
  imports: [
    AuthModule,
    UsersModule,
    ...(mongoOn
      ? [
          MongooseModule.forFeature([
            { name: BillingEventEntity.name, schema: BillingEventSchema },
          ]),
        ]
      : []),
  ],
  controllers: [BillingController],
  providers: [
    BillingService,
    ...(mongoOn
      ? [
          MongoBillingLedger,
          { provide: BILLING_LEDGER, useExisting: MongoBillingLedger },
        ]
      : [memoryLedger]),
  ],
})
export class BillingModule {}
