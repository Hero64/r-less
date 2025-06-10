import { App, Stack } from 'aws-cdk-lib';
import { IResource, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Role } from 'aws-cdk-lib/aws-iam';
import { Code, LayerVersion } from 'aws-cdk-lib/aws-lambda';
import { cwd } from 'node:process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  REALLY_LESS_CONTEXT,
  REALLY_LESS_CONTEXT_VALUE,
  ServicesValues,
} from '@really-less/common';
import type { CreateAppProps } from './app.types';
import { appManager } from '../manager/manager';

process.env[REALLY_LESS_CONTEXT] = REALLY_LESS_CONTEXT_VALUE;

class AppStack extends Stack {
  constructor(
    private scope: App,
    private props: CreateAppProps
  ) {
    const { name } = props;
    super(scope, name, {});
  }

  async init() {
    const { stacks, globalConfig } = this.props;
    await appManager.init(this, this.props);

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
