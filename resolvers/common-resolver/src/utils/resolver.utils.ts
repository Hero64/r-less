import { Duration, NestedStack, Tags } from 'aws-cdk-lib';
import {
  Code,
  Function as LambdaFunction,
  Runtime,
  Tracing,
} from 'aws-cdk-lib/aws-lambda';
import { LambdaMetadata } from '@really-less/common';

import { createRole } from '../resources/role';
import { getEnvValues } from '../resources/env';
import { CommonResolverProps } from '../types';

export const NodeRuntime = {
  18: Runtime.NODEJS_18_X,
  20: Runtime.NODEJS_20_X,
  22: Runtime.NODEJS_22_X,
};

interface CreateLambdaProps {
  pathName: string;
  filename: string;
  handler: LambdaMetadata;
  prefix?: string;
  excludeFiles?: string[];
}

export class CommonResolver {
  constructor(protected props: CommonResolverProps) {}

  protected createLambda({
    pathName,
    filename,
    handler,
    prefix = '',
    excludeFiles = [],
  }: CreateLambdaProps) {
    const lambdaName = `${prefix}_${handler.name}`;
    const { nestedStack, app } = this.props;

    const lambda = new LambdaFunction(nestedStack.scope, lambdaName, {
      runtime: NodeRuntime[handler.lambda?.runtime || 20],
      code: Code.fromAsset(pathName, {
        exclude: ['*.stack.js', ...excludeFiles.map((file) => `*-${file}.js`)],
      }),
      handler: `${filename}.${handler.name}`,
      timeout: handler.lambda?.timeout
        ? Duration.seconds(handler.lambda.timeout)
        : undefined,
      memorySize: handler.lambda?.memory,
      layers: app.layer ? [app.layer] : undefined,
      role: this.getRole(handler),
      environment: this.getEnvVariables(handler),
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

  private getRole(handler: LambdaMetadata) {
    const { app, nestedStack } = this.props;

    if (!handler.lambda?.services) {
      return nestedStack.lambdaGlobalConfig.role || app.lambdaGlobalConfig.role;
    }

    return createRole({
      name: `${handler.name}-role`,
      scope: nestedStack.scope,
      services: handler.lambda.services,
    });
  }

  private getEnvVariables(handler: LambdaMetadata) {
    const { app, nestedStack } = this.props;

    if (!handler.lambda?.env) {
      return nestedStack.lambdaGlobalConfig.env || app.lambdaGlobalConfig.env || app.env;
    }

    return getEnvValues(app.env, handler.lambda.env);
  }
}
