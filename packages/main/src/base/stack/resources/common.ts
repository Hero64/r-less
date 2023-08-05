import { Duration, NestedStack } from 'aws-cdk-lib';
import { Code, Function as LambdaFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { LambdaMetadata } from '../../../decorators/lambda/lambda';

export const NodeRuntime = {
  16: Runtime.NODEJS_16_X,
  18: Runtime.NODEJS_18_X,
};

export class CommonResource {
  constructor(protected scope: NestedStack, protected stackName: string) {}

  protected createLambda(
    pathName: string,
    filename: string,
    handler: LambdaMetadata,
    prefix: string = '',
    excludeFiles: string[] = []
  ) {
    return new LambdaFunction(this.scope, `${prefix}-${handler.name}`, {
      runtime: NodeRuntime[handler.lambda?.runtime || 18],
      code: Code.fromAsset(pathName, {
        exclude: ['*.stack.js', ...excludeFiles.map((file) => `*.${file}.js`)],
      }),
      handler: `${filename}.${handler.name}`,
      timeout: handler.lambda?.timeout
        ? Duration.seconds(handler.lambda.timeout)
        : undefined,
      memorySize: handler.lambda?.memory,
    });
  }
}
