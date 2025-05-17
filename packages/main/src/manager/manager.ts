import { Stack } from 'aws-cdk-lib';
import { ServicesValues } from '@really-less/common';
import {
  createRole,
  getEnvValues,
  ParserResolver,
  processEnvValues,
} from '@really-less/common-resolver';

import { CreateAppProps, GlobalConfig } from '../app/app.types';
import { Code, LayerVersion } from 'aws-cdk-lib/aws-lambda';
import { join } from 'node:path';
import { cwd } from 'node:process';
import { existsSync } from 'node:fs';
import { GlobalConfigProps, ObjectResolver } from './manger.types';

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

class AppManager {
  public globalConfig: GlobalConfigProps;
  public env: Record<string, any>;
  public scope: Stack;
  public resolvers: Record<string, ParserResolver>;
  public name: string;
  public layer: LayerVersion | undefined;

  async init(scope: Stack, props: CreateAppProps) {
    this.scope = scope;
    this.name = props.name;
    (this.layer = this.createLayer()), await this.parseEnvVariables();
    this.setResolvers(props.resolvers);
    this.setGlobalConfig(props.globalConfig || {});
  }

  private setGlobalConfig(config: GlobalConfig) {
    const { lambda, tags } = config;

    this.globalConfig = {
      lambda: {
        role: this.createRole(lambda?.services),
        env: lambda?.env ? getEnvValues(this.env, lambda.env) : undefined,
      },
      tags: tags || [],
    };
  }

  private createRole(services: ServicesValues[] = defaultServices) {
    return createRole({
      services,
      scope: this.scope,
      name: 'app-role',
    });
  }

  private createLayer() {
    let layer: LayerVersion | undefined = undefined;

    const layerPath = join(cwd(), '.resources/layers');

    if (existsSync(layerPath)) {
      layer = new LayerVersion(this.scope, 'app-layer', {
        code: Code.fromAsset(layerPath),
      });
    }

    return layer;
  }

  private async parseEnvVariables() {
    this.env = await processEnvValues(this.scope);
  }

  private setResolvers(resolvers: ParserResolver[]) {
    this.resolvers = resolvers.reduce(
      (prev, current) => ({ ...prev, [current.type]: current }),
      {} as ObjectResolver
    );
  }
}

export const appManager = new AppManager();
