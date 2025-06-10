import { NestedStack } from 'aws-cdk-lib';

import { type ResourceMetadata, ResourceReflectKeys } from '@really-less/common';

import type { CreateStackProps } from './stack.types';
import { appManager } from '../manager/manager';
import { createRole, getEnvValues } from '@really-less/common-resolver';

export class AppNestedStack extends NestedStack {
  constructor(private props: CreateStackProps) {
    const { name } = props;
    const { scope } = appManager;

    super(scope, name, {});
  }

  async generateResources() {
    const { name, resources } = this.props;

    const stackRole = this.getStackRole();
    const stackEnv = this.getStackEnv();

    for (const resource of resources) {
      const resourceMetadata: ResourceMetadata = Reflect.getMetadata(
        ResourceReflectKeys.RESOURCE,
        resource
      );

      const moduleResolver = appManager.resolvers[resourceMetadata.type];

      if (!moduleResolver) {
        throw new Error(`There is no resolver for the resource ${resourceMetadata.type}`);
      }

      await moduleResolver.parser({
        app: {
          name: appManager.name,
          scope: appManager.scope,
          env: appManager.env,
          layer: appManager.layer,
          lambdaGlobalConfig: appManager.globalConfig.lambda,
        },
        nestedStack: {
          name,
          scope: this,
          lambdaGlobalConfig: {
            env: stackEnv,
            role: stackRole,
          },
        },
        stackResource: resource,
      });
    }
  }

  private getStackRole() {
    const { name, globalConfig } = this.props;
    if (!globalConfig?.lambda?.services) {
      return;
    }

    return createRole({
      scope: this,
      services: globalConfig.lambda.services,
      name: `${name}-role`,
    });
  }

  private getStackEnv() {
    const { globalConfig } = this.props;
    if (!globalConfig?.lambda?.env) {
      return undefined;
    }

    return getEnvValues(appManager.env, globalConfig?.lambda?.env);
  }
}

export const createStack = (props: CreateStackProps) => () => {
  const appNestedStack = new AppNestedStack(props);
  return appNestedStack.generateResources();
};
