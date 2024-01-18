import { NestedStack } from 'aws-cdk-lib';
import { IResource, RestApi } from 'aws-cdk-lib/aws-apigateway';

import {
  ResourceMetadata,
  ResourceReflectKeys,
  ResourceType,
  ServicesValues,
} from '@really-less/common';
import { ApiResourceMetadata } from '@really-less/api';
import { StepFunctionResourceMetadata } from '@really-less/step_function';

import { AppResources } from '../app/app';
import { ApiProps, ApiResource } from './resources/api';
import { StepFunctionResource } from './resources/step_function';
import { EventResource } from './resources/event';
import { createRole } from '../role/role';
import { CommonResourceProps } from './resources/common';

interface StackConfig {
  apiGateway?: ApiProps;
  services?: ServicesValues[];
}

interface CreateStackProps extends StackConfig {
  name: string;
  resources: Resource[];
}

export interface Resource {
  new (...any: []): {};
}

export class AppNestedStack extends NestedStack {
  private api?: RestApi;
  private apiResources?: Record<string, IResource>;

  constructor(props: CreateStackProps, appResources: AppResources) {
    const { name, resources, apiGateway, services } = props;
    const { stack, api, role, layer, apiResources } = appResources;
    const isNewApiGateway = Boolean(apiGateway?.name);
    super(stack, name, {});

    this.api = isNewApiGateway ? undefined : api;
    this.apiResources = isNewApiGateway ? {} : apiResources;

    let resourceRole = role;
    if (services) {
      resourceRole = createRole({
        scope: stack,
        services,
        name,
      });
    }

    for (const resource of resources) {
      const resourceMetadata: ResourceMetadata = Reflect.getMetadata(
        ResourceReflectKeys.RESOURCE,
        resource
      );

      const commonOptions: CommonResourceProps = {
        layer,
        resource,
        scope: this,
        stackName: name,
        role: resourceRole,
      };

      switch (resourceMetadata.type) {
        case ResourceType.API: {
          const apiResource = new ApiResource({
            ...commonOptions,
            api: this.api,
            apiProps: apiGateway,
            apiMetadata: resourceMetadata as ApiResourceMetadata,
            apiResources: this.apiResources,
          });

          this.api = apiResource.generate();
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
}

export const createStack = (props: CreateStackProps) => (appResources: AppResources) => {
  return new AppNestedStack(props, appResources);
};
