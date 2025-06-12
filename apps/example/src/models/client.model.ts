import {
  createRepository,
  DynamoModel,
  Field,
  PartitionKey,
  SortKey,
} from '@really-less/dynamodb';

@DynamoModel({
  indexes: [
    {
      name: 'dni-birthdate-index',
      partitionKey: 'dni',
      sortKey: 'birthdate',
    },
  ],
})
export class Client {
  @PartitionKey
  dni: number;
  @SortKey
  name: string;
  @Field
  birthdate: string;
}

export const clientRepository = createRepository(Client);
