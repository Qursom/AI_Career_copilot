import { InsufficientCoinsError } from './users.store';
import { MemoryUsersStore } from './memory-users.store';

describe('MemoryUsersStore', () => {
  it('creates a user with 100 coins on first firebaseUid (sign-up)', async () => {
    const store = new MemoryUsersStore();
    const created = await store.findOrCreate(
      {
        firebaseUid: 'uid-new',
        email: 'ada@example.com',
        name: 'Ada Lovelace',
      },
      100,
    );
    expect(created).toMatchObject({
      firebaseUid: 'uid-new',
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      interviewCoins: 100,
    });
  });

  it('returns the existing profile and coins on later firebaseUid (sign-in)', async () => {
    const store = new MemoryUsersStore();
    await store.findOrCreate(
      { firebaseUid: 'uid-1', email: 'ada@example.com', name: 'Ada' },
      100,
    );
    await store.chargeCoins('uid-1', 10);

    const signedIn = await store.findOrCreate(
      {
        firebaseUid: 'uid-1',
        email: 'other@example.com',
        name: 'Someone Else',
      },
      100,
    );

    expect(signedIn).toMatchObject({
      firebaseUid: 'uid-1',
      email: 'ada@example.com',
      name: 'Ada',
      interviewCoins: 90,
    });
  });

  it('charges coins and rejects insufficient balance', async () => {
    const store = new MemoryUsersStore();
    await store.upsert('u1', 'a@b.c', 15);
    await expect(store.chargeCoins('u1', 10)).resolves.toMatchObject({
      interviewCoins: 5,
    });
    await expect(store.chargeCoins('u1', 10)).rejects.toBeInstanceOf(
      InsufficientCoinsError,
    );
  });
});
