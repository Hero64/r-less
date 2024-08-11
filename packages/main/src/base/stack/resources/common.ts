import { Duration, NestedStack, Tags } from 'aws-cdk-lib';
import {
  Code,
  Function as LambdaFunction,
  Runtime,
  Tracing,
} from 'aws-cdk-lib/aws-lambda';
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
  env?: Record<string, any>;
}

export class CommonResource {
  constructor(protected scope: NestedStack, protected stackName: string) {}

  protected createLambda({
    pathName,
    filename,
    handler,
    prefix = '',
    excludeFiles = [],
    env = {},
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

    const lambda = new LambdaFunction(this.scope, lambdaName, {
      runtime: NodeRuntime[handler.lambda?.runtime || 20],
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
      environment: env,
      tracing: handler?.lambda?.enableTrace ? Tracing.ACTIVE : Tracing.DISABLED,
    });

    this.createTags(lambda, handler.lambda?.tags);
    return lambda;
  }

  private createTags(lambda: LambdaFunction, tags: string[] = []) {
    const uniqueTags = new Set([...tags]);
    if (tags.length === 0) {
      return;
    }

    for (const tag of uniqueTags) {
      Tags.of(lambda).add(tag, 'true');
    }
  }
}
