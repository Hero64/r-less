import { Duration, Tags } from 'aws-cdk-lib';
import {
  type Function as LambdaFunction,
  Runtime,
  Tracing,
} from 'aws-cdk-lib/aws-lambda';
import type { LambdaMetadata } from '@really-less/common';

import { createRole } from '../resources/role';
import { getEnvValues } from '../resources/env';
import type { CommonResolverProps } from '../types';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import path from 'node:path';

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
  }: CreateLambdaProps) {
    const lambdaName = `${prefix}_${handler.name}`;
    const { nestedStack } = this.props;

    const lambda = new NodejsFunction(nestedStack.scope, lambdaName, {
      runtime: NodeRuntime[handler.lambda?.runtime || 20],
      entry: path.join(pathName, `${filename}.js`),
      handler: handler.name,
      timeout: handler.lambda?.timeout
        ? Duration.seconds(handler.lambda.timeout)
        : undefined,
      memorySize: handler.lambda?.memory,
      role: this.getRole(handler),
      environment: this.getEnvVariables(handler),
      tracing: handler?.lambda?.enableTrace ? Tracing.ACTIVE : Tracing.DISABLED,

      bundling: {
        minify: true,
        externalModules: ['@aws-sdk'],
        esbuildArgs: {
          '--log-level': 'silent',
          '--legal-comments': 'none',
        },
      },
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
