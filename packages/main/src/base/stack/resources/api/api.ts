import 'reflect-metadata';
import { RestApi, RestApiProps, IResource } from 'aws-cdk-lib/aws-apigateway';

import { ApiResourceMetadata, ApiLambdaMetadata } from '@really-less/api';
import { LambdaReflectKeys } from '@really-less/common';

import { CommonResourceProps } from '../common';
import { ApiLambdaIntegration } from './lambda_integration';
import { ApiServiceIntegration } from './service_integration';

export interface ApiProps {
  name?: string;
  options?: RestApiProps;
}

interface ApiResourceProps extends CommonResourceProps {
  apiMetadata: ApiResourceMetadata;
  apiProps?: ApiProps;
  api?: RestApi;
  apiResources: Record<string, IResource>;
}

export class ApiResource {
  private api: RestApi;

  constructor(private resourceProps: ApiResourceProps) {
    const { api } = resourceProps;

    this.api = this.createApiRest(api);
  }

  async generate() {
    const { resource, apiMetadata, scope, role, layer, stackName } = this.resourceProps;

    const handlers: ApiLambdaMetadata[] = Reflect.getMetadata(
      LambdaReflectKeys.HANDLERS,
      resource.prototype
    );

    for (const handler of handlers) {
      const apiResource = this.generateApiResource(handler);
      if (!handler.integration) {
        const lambdaIntegrations = new ApiLambdaIntegration({
          handler,
          apiResource,
          resource,
          apiMetadata,
          api: this.api,
          role,
          scope,
          layer,
          stackName,
        });

        lambdaIntegrations.create();
      } else {
        const serviceIntegration = new ApiServiceIntegration({
          api: this.api,
          apiMetadata,
          apiResource,
          handler,
          resource,
        });

        await serviceIntegration.create();
      }
    }

    return this.api;
  }

  private createApiRest(api?: RestApi) {
    if (api) {
      return api;
    }

    const { scope, stackName, apiProps } = this.resourceProps;

    return new RestApi(scope, apiProps?.name || `${stackName}-api`, apiProps?.options);
  }

  private generateApiResource = (handler: ApiLambdaMetadata) => {
    const { apiMetadata, apiResources } = this.resourceProps;

    let fullPath = `${this.cleanPath(apiMetadata.path)}/${this.cleanPath(handler.path)}`;

    if (apiResources[fullPath]) {
      return apiResources[fullPath];
    }

    if (fullPath === '/') {
      return this.api.root;
    }

    const resourceUrlList = fullPath.split('/');
    let principalApiResource = this.api.root;

    let paths = [];
    for (const resourceUrl of resourceUrlList) {
      paths.push(resourceUrl);
      const path = paths.join('/');
      if (apiResources[path]) {
        principalApiResource = apiResources[path];
        continue;
      }
      apiResources[path] = principalApiResource.addResource(resourceUrl);
      principalApiResource = apiResources[path];
    }

    return apiResources[fullPath];
  };

  private cleanPath = (path: string) => {
    return path.replace(/^\//, '').replace(/\/$/, '');
  };
}
