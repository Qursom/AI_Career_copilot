import dns from 'node:dns';
import { Global, Logger, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

/**
 * Some Windows/router DNS resolvers refuse SRV lookups, which breaks
 * mongodb+srv://. Public DNS fixes Atlas discovery on those networks.
 */
if (process.env.MONGODB_URI?.includes('mongodb+srv://')) {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

const uri = process.env.MONGODB_URI?.trim();

@Global()
@Module({
  imports: uri
    ? [
        MongooseModule.forRoot(uri, {
          serverSelectionTimeoutMS: 15_000,
          family: 4,
        }),
      ]
    : [],
  exports: uri ? [MongooseModule] : [],
})
export class DatabaseModule {
  constructor() {
    const logger = new Logger(DatabaseModule.name);
    if (uri) {
      logger.log(
        uri.includes('mongodb+srv://')
          ? 'MongoDB Atlas connection configured'
          : 'MongoDB connection configured',
      );
    } else {
      logger.warn('MONGODB_URI unset; MongoDB disabled');
    }
  }
}
