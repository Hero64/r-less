import { App, NestedStack, Stack } from 'aws-cdk-lib';
import { RestApiProps } from 'aws-cdk-lib/aws-apigateway';
import { REALLY_LESS_CONTEXT, REALLY_LESS_CONTEXT_VALUE } from '@really-less/main';

export type Environment = Record<string, number | string>;





export interface ApiGatewayProps {
  name: string;
  env?: Environment;
  props?: RestApiProps;
}

export interface GlobalConfig {
  env?: Environment;
  services?: 
  apiGateway?: ApiGatewayProps;
}

export interface AppResources {
  stack: Stack;
  global?: GlobalConfig;
}

export interface CreateAppProps {
  name: string;
  stacks: ((appResources: AppResources) => NestedStack)[];
}

process.env[REALLY_LESS_CONTEXT] = REALLY_LESS_CONTEXT_VALUE;

class AppStack extends Stack {
  constructor(scope: App, props: CreateAppProps) {
    const { stacks, name } = props;
    super(scope, name, {});
    for (let stack of stacks) {
      stack({
        stack: this,
      });
    }
  }
}

export const createApp = (props: CreateAppProps) => {
  const app = new App();
  return new AppStack(app, props);
};
