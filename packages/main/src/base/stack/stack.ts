import { NestedStack } from 'aws-cdk-lib';

import { ResourceMetadata, ResourceReflectKeys, ResourceType } from '@really-less/common';
import { ApiResourceMetadata } from '@really-less/api';
import { StepFunctionResourceMetadata } from '@really-less/step_function';

import { ApiProps, ApiResource } from './resources/api/api';
import { StepFunctionResource } from './resources/step-function';
import { EventResource } from './resources/event';
import { createRole } from '../role/role';
import { CommonResourceProps } from './resources/common';
import { appManager } from '../../utils/manager';
import { LambdaGlobalProps } from '../app/app';
import { getEnvironmentByResource } from '../env/env';

interface CreateStackProps extends LambdaGlobalProps {
  name: string;
  resources: Resource[];
  apiGateway?: ApiProps;
}

export interface Resource {
  new (...any: []): {};
}

export class AppNestedStack extends NestedStack {
  constructor(private props: CreateStackProps) {
    const { name } = props;
    const { stack } = appManager.global;

    super(stack, name, {});
  }

  async generateResources() {
    const { apiGateway, name, resources, env } = this.props;

    const role = this.createResourceRole();
    appManager.upsertResource(name, {
      role,
      apiResources: {},
      env: getEnvironmentByResource(name, env),
    });

    for (const resource of resources) {
      const resourceMetadata: ResourceMetadata = Reflect.getMetadata(
        ResourceReflectKeys.RESOURCE,
        resource
      );

      const commonOptions: CommonResourceProps = {
        resource,
        scope: this,
        stackName: name,
      };

      switch (resourceMetadata.type) {
        case ResourceType.API: {
          const apiResource = new ApiResource({
            ...commonOptions,
            apiProps: apiGateway,
            metadata: resourceMetadata as ApiResourceMetadata,
          });

          await apiResource.generate();
          break;
        }
        case ResourceType.STEP_FUNCTION: {
          const stepFunctionResource = new StepFunctionResource({
            ...commonOptions,
            metadata: resourceMetadata as StepFunctionResourceMetadata,
          });

          stepFunctionResource.generate();
          break;
        }
        case ResourceType.EVENT: {
          const eventResource = new EventResource({
            ...commonOptions,
            metadata: resourceMetadata,
          });

          eventResource.generate();
          break;
        }
      }
    }
  }

  private createResourceRole() {
    const { role, stack } = appManager.global;
    const { name, services } = this.props;
    let resourceRole = role;

    if (services) {
      resourceRole = createRole({
        scope: stack,
        services,
        name,
      });
    }

    return resourceRole;
  }
}

export const createStack = (props: CreateStackProps) => () => {
  const appNestedStack = new AppNestedStack(props);
  return appNestedStack.generateResources();
};
