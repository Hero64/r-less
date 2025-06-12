import type { CommonResolverProps, ParserResolver } from '@really-less/common-resolver';
import type { Stack } from 'aws-cdk-lib';
import type { ClassResource } from '@really-less/common';
import { DynamoParser } from './parser/parser';

export class DynamoResolver implements ParserResolver {
  public type = 'DYNAMODB';

  constructor(private models: ClassResource[]) {}

  public initAppResources(scope: Stack) {
    for (const model of this.models) {
      const dynamoParser = new DynamoParser(model, scope);
      dynamoParser.generate();
    }
  }

  public async parser(_props: CommonResolverProps) {
    throw new Error('It is not possible to parse this service');
  }
}
