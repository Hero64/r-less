import { NestedStack } from 'aws-cdk-lib';
import { RestApi } from 'aws-cdk-lib/aws-apigateway';
import {
  ApiResourceMetadata,
  ResourceMetadata,
  ResourceReflectKeys,
  ResourceType,
  StepFunctionResourceMetadata,
} from '../../../../main/lib';
import { AppResources } from '../app/app';
import { ApiProps, ApiResource } from './resources/api';
import { StepFunctionResource } from './resources/step_function';
import { EventResource } from './resources/event';

interface StackConfig {
  apiGateway?: ApiProps;
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

  constructor(props: CreateStackProps, appResources: AppResources) {
    const { name, resources, apiGateway } = props;
    const { stack, api } = appResources;
    super(stack, name, {});

    this.api = apiGateway?.name ? undefined : api;

    for (const resource of resources) {
      const resourceMetadata: ResourceMetadata = Reflect.getMetadata(
        ResourceReflectKeys.RESOURCE,
        resource
      );

      switch (resourceMetadata.type) {
        case ResourceType.API: {
          const apiResource = new ApiResource({
            resource,
            scope: this,
            stackName: name,
            api: this.api,
            apiProps: apiGateway,
            apiMetadata: resourceMetadata as ApiResourceMetadata,
          });

          this.api = apiResource.generate();
          break;
        }
        case ResourceType.STEP_FUNCTION: {
          const stepFunctionResource = new StepFunctionResource({
            resource,
            scope: this,
            stackName: name,
            metadata: resourceMetadata as StepFunctionResourceMetadata,
          });

          stepFunctionResource.generate();
          break;
        }
        case ResourceType.EVENT: {
          const eventResource = new EventResource({
            resource,
            scope: this,
            stackName: name,
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
