import { InsufficientCoinsError } from './users.store';
import { MemoryUsersStore } from './memory-users.store';

describe('MemoryUsersStore', () => {
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
