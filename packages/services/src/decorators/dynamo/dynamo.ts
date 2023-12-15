import 'reflect-metadata';

import { KeyOfClass } from '../../types/utils';

export enum ModelMetadataKeys {
  MODEL = 'dynamo:model',
  PARTITION_KEY = 'dynamo:partition_key',
  SORT_KEY = 'dynamo:sort_key',
}

export interface DynamoIndex<T extends Function> {
  name: string;
  partitionKey: KeyOfClass<T>;
  sortKey?: KeyOfClass<T>;
}

export interface DynamoModelProps<T extends Function> {
  name?: string;
  indexes?: DynamoIndex<T>[];
}

export const DynamoModel =
  <T extends Function>(props: DynamoModelProps<T>) =>
  (constructor: T) => {
    const { name = constructor.name, indexes = [] } = props;

    Reflect.defineMetadata(
      ModelMetadataKeys.MODEL,
      {
        name,
        indexes,
      },
      constructor
    );
  };

export const PartitionKey = (constructor: any, name: string) => {
  Reflect.defineMetadata(ModelMetadataKeys.PARTITION_KEY, name, constructor);
};

export const SortKey = (constructor: any, name: string) => {
  Reflect.defineMetadata(ModelMetadataKeys.SORT_KEY, name, constructor);
};
