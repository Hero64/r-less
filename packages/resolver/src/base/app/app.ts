import { App, NestedStack, Stack } from 'aws-cdk-lib';
import { RestApi, RestApiProps } from 'aws-cdk-lib/aws-apigateway';
import { Role } from 'aws-cdk-lib/aws-iam';
import {
  REALLY_LESS_CONTEXT,
  REALLY_LESS_CONTEXT_VALUE,
  ServicesValues,
} from '@really-less/main';

import { createRole } from '../role/role';

export type Environment = Record<string, number | string>;

export interface ApiGatewayGlobalProps {
  name: string;
  props?: RestApiProps;
}

export interface LambdaGlobalProps {
  environment?: Environment;
  services?: ServicesValues[];
}

export interface GlobalConfig {
  /**
   * Applies to all lambdas
   */
  env?: Environment;
  /**
   * Api gateway config by all api resource
   */
  apiGateway?: ApiGatewayGlobalProps;
  /**
   * Lambda config
   */
  lambda?: LambdaGlobalProps;
}

export interface AppResources {
  stack: Stack;
  api?: RestApi;
  role: Role;
}

export interface CreateAppProps {
  name: string;
  stacks: ((appResources: AppResources) => NestedStack)[];
  global?: GlobalConfig;
}

process.env[REALLY_LESS_CONTEXT] = REALLY_LESS_CONTEXT_VALUE;

class AppStack extends Stack {
  constructor(scope: App, props: CreateAppProps) {
    const { stacks, name, global } = props;
    super(scope, name, {});
    let globalRestApi: RestApi | undefined = undefined;
    if (global?.apiGateway) {
      globalRestApi = new RestApi(scope, global.apiGateway.name, global.apiGateway.props);
    }

    const appRole = createRole({
      scope: this,
      services: global?.lambda?.services || [
        'dynamodb',
        's3',
        'lambda',
        'cloudwatch',
        'sqs',
        'step_function',
        'kms',
        'ssm',
        'event',
      ],
      name: 'app-rol',
    });

    for (let stack of stacks) {
      stack({
        stack: this,
        api: globalRestApi,
        role: appRole,
      });
    }
  }
}

export const createApp = (props: CreateAppProps) => {
  const app = new App();
  return new AppStack(app, props);
};
