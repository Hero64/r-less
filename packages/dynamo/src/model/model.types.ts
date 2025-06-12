import 'reflect-metadata';
import type { OnlyNumberString } from '@really-less/common';

export enum ModelMetadataKeys {
  MODEL = 'dynamo:model',
  PARTITION_KEY = 'dynamo:partition_key',
  SORT_KEY = 'dynamo:sort_key',
  FIELDS = 'dynamo:fields',
}

export interface DynamoIndex<T extends Function> {
  name: string;
  partitionKey: keyof OnlyNumberString<T['prototype']>;
  sortKey?: keyof OnlyNumberString<T['prototype']>;
}

export interface DynamoModelProps<T extends Function> {
  name?: string;
  indexes?: DynamoIndex<T>[];
  tracing?: boolean;
}

export interface FieldProps {
  name: string;
  type: string;
}

export type FieldsMetadata = Record<string, FieldProps>;
