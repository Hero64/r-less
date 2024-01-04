import 'reflect-metadata';
import { DynamoModel, PartitionKey, SortKey } from '../../decorators/dynamo/dynamo';
import { createRepository, client } from './dynamo';

interface Address {
  city: string;
  direction: string;
  number: number;
}

@DynamoModel({
  name: 'users',
  tracing: true,
  indexes: [
    {
      name: '',
      partitionKey: 'email',
      sortKey: 'age',
    },
  ],
})
class User {
  @PartitionKey
  readonly email!: string;
  @SortKey
  readonly name!: string;
  readonly lastName!: string;
  readonly age!: number;
  readonly address?: Address;
}

const userRepository = createRepository(User);
const EMAIL = 'example1@example.com';

describe('Dynamo Service', () => {
  afterAll(() => {
    client.destroy();
  });

  describe('READ', () => {
    it('Should find one user', async () => {
      const user = await userRepository.findOne({
        keyCondition: {
          partition: {
            email: EMAIL,
          },
        },
      });

      expect(user).toBeDefined();
      expect(user.email).toBe(EMAIL);
    });

    it('Should find one user by partition and sort key', async () => {
      const name = 'example1';
      const user = await userRepository.findOne({
        keyCondition: {
          partition: {
            email: EMAIL,
          },
          sort: {
            name,
          },
        },
      });

      expect(user).toBeDefined();
      expect(user.email).toBe(EMAIL);
      expect(user.name).toBe(name);
    });

    it('Should return undefined by nonexistent user', async () => {
      const user = await userRepository.findOne({
        keyCondition: {
          partition: {
            email: 'nonexistent@example.com',
          },
        },
      });

      expect(user).toBeUndefined();
    });

    it('Should get all users with same partition key', async () => {
      const { data } = await userRepository.findAll({
        keyCondition: {
          partition: {
            email: EMAIL,
          },
        },
      });

      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBeTruthy();
      expect(data[0]).toBeDefined;
    });

    it('Should throws by bad partition key', async () => {
      const call = async () => {
        await userRepository.findAll({
          keyCondition: {
            partition: {
              name: 'its not partition key',
            },
          },
        });
      };

      expect(call).rejects.toThrowError();
    });

    it('Should scan all users', async () => {
      const { data } = await userRepository.scan();

      expect(data).toBeDefined();
      expect(data.length).toBe(2);
    });

    it('Should filter users', async () => {
      const { data } = await userRepository.scan({
        filter: {
          age: {
            lessThan: 25,
          },
        },
      });

      expect(data).toBeDefined();
      expect(data.length).toBe(1);
    });
  });

  describe('CREATE', () => {
    it('Should create a new user', async () => {
      const user = await userRepository.create({
        email: 'example3@example.com',
        age: 40,
        name: 'example3',
        lastName: 'example3',
      });

      expect(user).toBeDefined();

      const { data } = await userRepository.scan();

      expect(data.length).toBe(3);
    });
  });

  describe('UPDATE', () => {
    it('Should update user', async () => {
      const name = 'example1';
      const updated = await userRepository.update({
        keyCondition: {
          email: EMAIL,
          name,
        },
        values: {
          age: 55,
        },
      });

      expect(updated).toBeTruthy();

      const user = await userRepository.findOne({
        keyCondition: {
          partition: {
            email: EMAIL,
          },
          sort: {
            name,
          },
        },
      });

      expect(user.age).toBe(55);
    });

    // test update removing value

    // test updating and removing values
  });

  describe('REMOVE', () => {
    it('Should remove user', async () => {
      await userRepository.delete({
        email: EMAIL,
        name: 'example1',
      });

      const user = await userRepository.findOne({
        keyCondition: {
          partition: {
            email: EMAIL,
          },
        },
      });

      expect(user).toBeUndefined();
    });
  });
});
