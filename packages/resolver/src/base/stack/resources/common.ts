import { Duration, NestedStack } from 'aws-cdk-lib';
import {
  Code,
  Function as LambdaFunction,
  LayerVersion,
  Runtime,
} from 'aws-cdk-lib/aws-lambda';
import { LambdaMetadata } from '../../../../../main/lib';
import { Role } from 'aws-cdk-lib/aws-iam';
import { createRole } from '../../role/role';
import { Resource } from '../stack';

export interface CommonResourceProps {
  scope: NestedStack;
  stackName: string;
  role: Role;
  resource: Resource;
  layer?: LayerVersion;
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
  role?: Role;
  layer?: LayerVersion;
}

export class CommonResource {
  constructor(
    protected scope: NestedStack,
    protected stackName: string,
    protected role: Role,
    protected layer?: LayerVersion
  ) {}

  protected createLambda({
    pathName,
    filename,
    handler,
    role,
    layer,
    prefix = '',
    excludeFiles = [],
  }: CreateLambdaProps) {
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
