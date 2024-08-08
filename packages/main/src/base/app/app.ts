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

import { createRole } from '../role/role';
import { ApiProps } from '../stack/resources/api/api';
import { appManager } from '../../utils/manager';
import { EnvironmentResource, processEnvValues } from '../env/env';

export interface LambdaGlobalProps {
  env?: EnvironmentResource;
  services?: ServicesValues[];
}

export interface GlobalConfig {
  /**
   * Api gateway config by all api resource
   */
  apiGateway?: ApiProps;
  /**
   * Lambda config
   */
  lambda?: LambdaGlobalProps;
}

export interface AppResources {
  stack: Stack;
  role: Role;
  apiResources: Record<string, IResource>;
  env: Record<string, any>;
  layer?: LayerVersion;
  api?: RestApi;
}

export interface CreateAppProps {
  name: string;
  stacks: (() => Promise<void>)[];
  global?: GlobalConfig;
}

process.env[REALLY_LESS_CONTEXT] = REALLY_LESS_CONTEXT_VALUE;

const defaultServices: ServicesValues[] = [
  'dynamodb',
  's3',
  'lambda',
  'cloudwatch',
  'sqs',
  'step_function',
  'kms',
  'ssm',
  'event',
];

class AppStack extends Stack {
  constructor(private scope: App, private props: CreateAppProps) {
    const { name } = props;
    super(scope, name, {});
  }

  async init() {
    const { stacks } = this.props;

    appManager.setAppResources({
      stack: this,
      role: this.createDefaultRole(),
      api: this.createDefaultApiGateway(),
      layer: this.createLambdaLayer(),
      apiResources: {},
      env: await processEnvValues(this),
    });

    for (let stack of stacks) {
      await stack();
    }
  }

  private createDefaultRole() {
    const { global } = this.props;

    return createRole({
      scope: this,
      services: global?.lambda?.services || defaultServices,
      name: 'app-role',
    });
  }

  private createDefaultApiGateway() {
    const { global } = this.props;

    if (!global?.apiGateway) {
      return;
    }

    return new RestApi(
      this.scope,
      global.apiGateway.name || `${this.props.name}-global-api`,
      global.apiGateway.options
    );
  }

  private createLambdaLayer() {
    let appLayer: LayerVersion | undefined = undefined;

    const layerPath = join(cwd(), '.resources/layers');

    if (existsSync(layerPath)) {
      appLayer = new LayerVersion(this, 'app-layer', {
        code: Code.fromAsset(layerPath),
      });
    }

    return appLayer;
  }
}

export const createApp = async (props: CreateAppProps) => {
  const app = new App();
  const appStack = new AppStack(app, props);
  await appStack.init();
};
