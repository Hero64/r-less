import { Duration, NestedStack } from 'aws-cdk-lib';
import { Code, Function as LambdaFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { LambdaMetadata, ServicesValues } from '../../../../../main/lib';
import { Role } from 'aws-cdk-lib/aws-iam';
import { createRole } from '../../role/role';

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
}

export class CommonResource {
  constructor(
    protected scope: NestedStack,
    protected stackName: string,
    protected role: Role
  ) {}

  protected createLambda({
    pathName,
    filename,
    handler,
    role,
    prefix = '',
    excludeFiles = [],
  }: CreateLambdaProps) {
    const lambdaName = `${prefix}-${handler.name}`;

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
        exclude: ['*.stack.js', ...excludeFiles.map((file) => `*.${file}.js`)],
      }),
      handler: `${filename}.${handler.name}`,
      timeout: handler.lambda?.timeout
        ? Duration.seconds(handler.lambda.timeout)
        : undefined,
      memorySize: handler.lambda?.memory,
      role: lambdaRole,
    });
  }
}
