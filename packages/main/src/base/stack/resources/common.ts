import { Duration, NestedStack } from 'aws-cdk-lib';
import { Code, Function as LambdaFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { LambdaMetadata } from '@really-less/common';

import { createRole } from '../../role/role';
import { Resource } from '../stack';
import { appManager } from '../../../utils/manager';

export interface CommonResourceProps {
  scope: NestedStack;
  stackName: string;
  resource: Resource;
}

export const NodeRuntime = {
  16: Runtime.NODEJS_16_X,
  18: Runtime.NODEJS_18_X,
  20: Runtime.NODEJS_20_X,
};

interface CreateLambdaProps {
  pathName: string;
  filename: string;
  handler: LambdaMetadata;
  prefix?: string;
  excludeFiles?: string[];
}

export class CommonResource {
  constructor(protected scope: NestedStack, protected stackName: string) {}

  protected createLambda({
    pathName,
    filename,
    handler,
    prefix = '',
    excludeFiles = [],
  }: CreateLambdaProps) {
    const { layer } = appManager.global;
    const { role } = appManager.resources[this.stackName];
    const lambdaName = `${prefix}_${handler.name}`;

    const lambdaRole = handler?.lambda?.services
      ? createRole({
          scope: this.scope,
          name: lambdaName,
          services: handler?.lambda?.services || [],
        })
      : role;

    return new LambdaFunction(this.scope, lambdaName, {
      runtime: NodeRuntime[handler.lambda?.runtime || 18],
      code: Code.fromAsset(pathName, {
        exclude: ['*.stack.js', ...excludeFiles.map((file) => `*-${file}.js`)],
      }),
      handler: `${filename}.${handler.name}`,
      timeout: handler.lambda?.timeout
        ? Duration.seconds(handler.lambda.timeout)
        : undefined,
      memorySize: handler.lambda?.memory,
      role: lambdaRole,
      layers: layer ? [layer] : undefined,
    });
  }
}
