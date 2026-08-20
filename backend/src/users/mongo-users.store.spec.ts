import type { Model } from 'mongoose';
import { MongoUsersStore } from './mongo-users.store';
import type { UserDocument } from './user.schema';

const STARTING_COINS = 150;

const INPUT = {
  firebaseUid: 'uid-1',
  email: 'Ada@Example.com',
  name: ' Ada Lovelace ',
  photoUrl: 'https://example.com/ada.png',
};

function doc(overrides?: Partial<Record<string, unknown>>) {
  return {
    _id: 'mongo-1',
    firebaseUid: 'uid-1',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    photoUrl: 'https://example.com/ada.png',
    interviewCoins: STARTING_COINS,
    ...overrides,
  } as unknown as UserDocument;
}

function duplicateKeyError() {
  return Object.assign(new Error('E11000 duplicate key error'), {
    code: 11000,
  });
}

function build(model: {
  findOne: jest.Mock;
  create: jest.Mock;
  findOneAndUpdate?: jest.Mock;
}) {
  return new MongoUsersStore(model as unknown as Model<UserDocument>);
}

describe('MongoUsersStore.findOrCreate', () => {
  it('creates the user with the starting coin balance on first sign-in', async () => {
    const model = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(doc()),
    };

    const record = await build(model).findOrCreate(INPUT, STARTING_COINS);

    expect(model.create).toHaveBeenCalledWith({
      firebaseUid: 'uid-1',
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      photoUrl: 'https://example.com/ada.png',
      interviewCoins: STARTING_COINS,
    });
    expect(record.interviewCoins).toBe(STARTING_COINS);
  });

  it('returns the existing user without recreating it or resetting coins', async () => {
    const model = {
      findOne: jest.fn().mockResolvedValue(doc({ interviewCoins: 30 })),
      create: jest.fn(),
    };

    const record = await build(model).findOrCreate(INPUT, STARTING_COINS);

    expect(model.create).not.toHaveBeenCalled();
    expect(record.interviewCoins).toBe(30);
  });

  it('recovers the winning row when two concurrent logins race the unique index', async () => {
    // First lookup misses for both requests; the loser's insert trips the
    // unique index on firebaseUid and must fall back to a re-read.
    const model = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(doc()),
      create: jest.fn().mockRejectedValue(duplicateKeyError()),
    };

    const record = await build(model).findOrCreate(INPUT, STARTING_COINS);

    expect(record.id).toBe('mongo-1');
    expect(model.findOne).toHaveBeenCalledTimes(2);
  });

  it('rethrows non-duplicate write failures', async () => {
    const model = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockRejectedValue(new Error('connection reset')),
    };

    await expect(
      build(model).findOrCreate(INPUT, STARTING_COINS),
    ).rejects.toThrow('connection reset');
  });
});

describe('MongoUsersStore.refundCoins', () => {
  it('increments the balance atomically', async () => {
    const findOneAndUpdate = jest
      .fn()
      .mockResolvedValue(doc({ interviewCoins: 150 }));
    const model = {
      findOne: jest.fn(),
      create: jest.fn(),
      findOneAndUpdate,
    };

    const record = await build(model).refundCoins('uid-1', 10);

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { firebaseUid: 'uid-1' },
      { $inc: { interviewCoins: 10 } },
      { new: true },
    );
    expect(record.interviewCoins).toBe(150);
  });

  it('throws when the user no longer exists', async () => {
    const model = {
      findOne: jest.fn(),
      create: jest.fn(),
      findOneAndUpdate: jest.fn().mockResolvedValue(null),
    };

    await expect(build(model).refundCoins('ghost', 10)).rejects.toThrow(
      'Cannot refund unknown user ghost',
    );
  });
});
