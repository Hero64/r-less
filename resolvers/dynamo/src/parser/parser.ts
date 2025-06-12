import type { ClassResource } from '@really-less/common';
import {
  type GlobalSecondaryIndexPropsV2,
  TableV2,
  type Attribute,
  AttributeType,
} from 'aws-cdk-lib/aws-dynamodb';
import type { Stack } from 'aws-cdk-lib';

import type { DynamoFieldType } from './parser.types';
import { getModelInformation, type FieldsMetadata } from '@really-less/dynamodb';

const ValidPartitionTypes = new Set<DynamoFieldType>(['Number', 'String']);

export class DynamoParser {
  private fields: FieldsMetadata = {};
  constructor(
    private model: ClassResource,
    protected scope: Stack
  ) {}

  public generate() {
    const {
      modelProps,
      partitionKey: partitionKeyName,
      sortKey: sortKeyName,
      fields,
    } = getModelInformation(this.model);

    this.fields = fields;

    console.log(fields);

    const indexes: GlobalSecondaryIndexPropsV2[] = [];

    for (const index of modelProps.indexes || []) {
      indexes.push({
        indexName: index.name,
        ...this.getPrincipalKeys(index.partitionKey as string, index.sortKey as string),
      });
    }

    new TableV2(this.scope, modelProps.name, {
      globalSecondaryIndexes: indexes,
      ...this.getPrincipalKeys(partitionKeyName, sortKeyName),
    });
  }

  private getPrincipalKeys(
    partitionKey: string,
    sortKey?: string
  ): Pick<GlobalSecondaryIndexPropsV2, 'partitionKey' | 'sortKey'> {
    return {
      partitionKey: this.getAttribute(partitionKey) as Attribute,
      sortKey: this.getAttribute(sortKey),
    };
  }

  private getAttribute(name?: string): Attribute | undefined {
    if (!name || !this.fields[name]) {
      return undefined;
    }

    const field = this.fields[name];

    return {
      name,
      type: this.getDynamoType(field.type as DynamoFieldType),
    };
  }

  private getDynamoType(type: DynamoFieldType) {
    if (!ValidPartitionTypes.has(type)) {
      throw new Error('partition, sort and indexes can only be numbers or strings');
    }
    const types: Record<DynamoFieldType, AttributeType> = {
      String: AttributeType.STRING,
      Number: AttributeType.NUMBER,
    };

    return types[type];
  }
}
