import { App, NestedStack, Stack } from 'aws-cdk-lib';
import { RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Role } from 'aws-cdk-lib/aws-iam';
import { REALLY_LESS_BUILD } from 'constants/env.constants';

export interface AppResources {
  stack: Stack;
  api?: RestApi;
  roles?: Role[];
}

export interface CreateAppProps {
  name: string;
  stacks: ((appResources: AppResources) => NestedStack)[];
}

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
  process.env[REALLY_LESS_BUILD] = 'IN PROGRESS';
  return new AppStack(app, props);
};
