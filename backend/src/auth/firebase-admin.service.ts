import { existsSync, readFileSync } from 'fs';
import { isAbsolute, resolve } from 'path';
import { Injectable, Logger } from '@nestjs/common';
import { TypedConfigService } from '../config/typed-config.service';

type FirebaseApp = { name?: string };

type ServiceAccountJson = {
  project_id: string;
  client_email: string;
  private_key: string;
};

export interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  name: string;
  picture: string;
}

@Injectable()
export class FirebaseAdminService {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private app: FirebaseApp | null = null;
  private initAttempted = false;

  constructor(private readonly config: TypedConfigService) {}

  get enabled(): boolean {
    this.ensureInit();
    return this.app !== null;
  }

  async verifyIdToken(token: string): Promise<VerifiedFirebaseUser> {
    this.ensureInit();
    if (!this.app) {
      throw new Error('Firebase Admin is not configured');
    }
    const { getAuth } = await import('firebase-admin/auth');
    const decoded = await getAuth(this.app as never).verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email ?? `${decoded.uid}@users.local`,
      name: (decoded.name as string | undefined)?.trim() || 'User',
      picture: (decoded.picture as string | undefined) ?? '',
    };
  }

  private ensureInit(): void {
    if (this.initAttempted) return;
    this.initAttempted = true;

    try {
      // Dynamic import keeps Jest from loading firebase-admin ESM at module load.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const appMod = require('firebase-admin/app') as {
        cert: (s: object | string) => unknown;
        getApps: () => FirebaseApp[];
        initializeApp: (opts: object) => FirebaseApp;
      };
      const existing = appMod.getApps()[0];
      if (existing) {
        this.app = existing;
        return;
      }

      const fromFile = this.loadServiceAccountFile();
      if (fromFile) {
        this.app = appMod.initializeApp({
          credential: appMod.cert(fromFile),
          projectId: fromFile.project_id,
        });
        this.logger.log(
          `Firebase Admin initialized from service account file for project ${fromFile.project_id}`,
        );
        return;
      }

      const projectId = this.config.get('FIREBASE_PROJECT_ID');
      const clientEmail = this.config.get('FIREBASE_CLIENT_EMAIL');
      const privateKey = normalizePrivateKey(
        this.config.get('FIREBASE_PRIVATE_KEY'),
      );

      if (!projectId || !clientEmail || !privateKey) {
        this.logger.warn(
          'Firebase Admin is not configured. Auth will accept x-user-id in non-production.',
        );
        return;
      }

      this.app = appMod.initializeApp({
        credential: appMod.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
      this.logger.log(`Firebase Admin initialized from env for project ${projectId}`);
    } catch (err) {
      this.app = null;
      this.logger.error(
        `Firebase Admin failed to initialize: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private loadServiceAccountFile(): ServiceAccountJson | null {
    const fromConfig = this.config.get('FIREBASE_SERVICE_ACCOUNT_PATH');
    const configured =
      (typeof fromConfig === 'string' ? fromConfig : '') ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      '';
    if (!configured.trim()) return null;

    const resolved = isAbsolute(configured)
      ? configured
      : resolve(process.cwd(), configured);
    if (!existsSync(resolved)) {
      this.logger.warn(`Firebase service account file not found: ${resolved}`);
      return null;
    }

    const parsed = JSON.parse(
      readFileSync(resolved, 'utf8'),
    ) as Partial<ServiceAccountJson>;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      this.logger.warn(
        'Firebase service account file is missing project_id, client_email, or private_key',
      );
      return null;
    }

    return {
      project_id: parsed.project_id,
      client_email: parsed.client_email,
      private_key: parsed.private_key.replace(/\\n/g, '\n'),
    };
  }
}

function normalizePrivateKey(raw?: string): string | undefined {
  if (!raw) return undefined;
  let key = raw.replace(/\\n/g, '\n').trim().replace(/,+$/, '');
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).replace(/\\n/g, '\n').trim();
  }
  if (!key.includes('BEGIN PRIVATE KEY')) {
    key = `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----\n`;
  }
  return key;
}
