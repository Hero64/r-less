import { App, Stack } from 'aws-cdk-lib';

import { REALLY_LESS_CONTEXT, REALLY_LESS_CONTEXT_VALUE } from '@really-less/common';
import type { CreateAppProps } from './app.types';
import { appManager } from '../manager/manager';

process.env[REALLY_LESS_CONTEXT] = REALLY_LESS_CONTEXT_VALUE;

class AppStack extends Stack {
  constructor(
    protected scope: App,
    protected props: CreateAppProps
  ) {
    const { name } = props;
    super(scope, name, {});
  }

  async init() {
    const { stacks, resolvers } = this.props;
    await appManager.init(this, this.props);

    for (const resolver of resolvers) {
      if (resolver.initAppResources) {
        resolver.initAppResources(this, this.props.name);
      }
    }

    for (const stack of stacks) {
      await stack();
    }
  }
}

export const createApp = async (props: CreateAppProps) => {
  const app = new App();
  const appStack = new AppStack(app, props);
  await appStack.init();
};
