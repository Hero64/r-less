import 'reflect-metadata';
import { RestApi, RestApiProps } from 'aws-cdk-lib/aws-apigateway';

import { ApiResourceMetadata, ApiLambdaMetadata } from '@really-less/api';
import { LambdaReflectKeys } from '@really-less/common';

import { CommonResourceProps } from '../common';
import { ApiLambdaIntegration } from './lambda-integration';
import { ApiServiceIntegration } from './service-integration';
import { appManager } from '../../../../utils/manager';

export interface ApiProps {
  name?: string;
  options?: RestApiProps;
}

interface ApiResourceProps extends CommonResourceProps {
  metadata: ApiResourceMetadata;
  apiProps?: ApiProps;
}

export class ApiResource {
  constructor(private resourceProps: ApiResourceProps) {
    this.createApiRest();
  }

  async generate() {
    const { resource, metadata, scope, stackName } = this.resourceProps;

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
          metadata,
          scope,
          stackName,
        });

        lambdaIntegrations.create();
      } else {
        const serviceIntegration = new ApiServiceIntegration({
          metadata,
          apiResource,
          handler,
          resource,
        });

        await serviceIntegration.create();
      }
    }
  }

  private createApiRest() {
    const { scope, stackName, apiProps } = this.resourceProps;

    const { api } = appManager.resources[stackName];
    const { api: globalApi } = appManager.global;

    appManager.upsertResource(stackName, {
      api:
        api ||
        globalApi ||
        new RestApi(scope, apiProps?.name || `${stackName}-api`, apiProps?.options),
    });
  }

  private generateApiResource = (handler: ApiLambdaMetadata) => {
    const { metadata, stackName } = this.resourceProps;
    const { apiResources, api } = appManager.resources[this.resourceProps.stackName];

    let fullPath = `${this.cleanPath(metadata.path)}/${this.cleanPath(handler.path)}`;

    if (apiResources[fullPath]) {
      return apiResources[fullPath];
    }

    if (fullPath === '/') {
      return api.root;
    }

    const resourceUrlList = fullPath.split('/');
    let principalApiResource = api.root;

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

    appManager.upsertResource(stackName, {
      apiResources,
    });

    return apiResources[fullPath];
  };

  private cleanPath = (path: string) => {
    return path.replace(/^\//, '').replace(/\/$/, '');
  };
}
