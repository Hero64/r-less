import { App, NestedStack, Stack } from 'aws-cdk-lib';
import { IResource, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Role } from 'aws-cdk-lib/aws-iam';
import { Code, LayerVersion } from 'aws-cdk-lib/aws-lambda';
import { cwd } from 'node:process';
import { existsSync } from 'node:fs';

import {
  REALLY_LESS_CONTEXT,
  REALLY_LESS_CONTEXT_VALUE,
  ServicesValues,
} from '@really-less/common';
import { createRole } from '../role/role';
import { join } from 'node:path';
import { ApiProps } from '../stack/resources/api/api';

export type Environment = Record<string, number | string>;

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
  layer?: LayerVersion;
  api?: RestApi;
}

export interface CreateAppProps {
  name: string;
  stacks: ((appResources: AppResources) => Promise<void>)[];
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

    for (let stack of stacks) {
      await stack({
        stack: this,
        api: this.createDefaultApiGateway(),
        role: this.createDefaultRole(),
        layer: this.createLambdaLayer(),
        apiResources: {},
      });
    }
  }

  private createDefaultRole() {
    const { global } = this.props;

    return createRole({
      scope: this,
      services: global?.lambda?.services || defaultServices,
      name: 'app-rol',
    });
  }

  private createDefaultApiGateway() {
    const { global } = this.props;

    if (!global?.apiGateway) {
      return;
    }

    return new RestApi(
      this.scope,
      global.apiGateway.name || `${name}-global-api`,
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
