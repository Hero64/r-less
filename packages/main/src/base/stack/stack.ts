import { NestedStack } from 'aws-cdk-lib';
import { RestApi } from 'aws-cdk-lib/aws-apigateway';
import { ApiResourceMetadata } from '../../decorators/api/api';
import { AppResources } from '../app.base';
import { ApiProps, ApiResource } from './resources/api';
import { ResourceReflectKeys, ResourceType } from '../../decorators/resource/resource';

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
      const resourceMetadata: ApiResourceMetadata = Reflect.getMetadata(
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
            apiMetadata: resourceMetadata,
          });

          this.api = apiResource.generate();
        }
      }
    }
  }
}

export const createStack = (props: CreateStackProps) => (appResources: AppResources) => {
  return new AppNestedStack(props, appResources);
};
