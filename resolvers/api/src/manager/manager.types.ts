import type { Stack } from 'aws-cdk-lib';
import type { RestApiProps } from 'aws-cdk-lib/aws-apigateway';

export interface RestApiOptions extends Omit<RestApiProps, 'restApiName'> {
  restApiName: string;
}

export interface ManagerInitializeProps {
  appScope: Stack;
  apiName: string;
}
