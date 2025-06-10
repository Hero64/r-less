import type { ApiLambdaMetadata } from '@really-less/api';

import { apiManager } from '../../manager/manger';
import { LambdaIntegration } from './integration/lambda.integration';
import type { ApiResolverProps } from './api.types';
import { ServiceIntegration } from './integration/service.integration';

export class ApiResolver {
  constructor(protected props: ApiResolverProps) {
    apiManager.initialize({
      appScope: props.app.scope,
      apiName: props.apiMetadata.apiGatewayName || 'default',
    });
  }

  async addRoute(handlerMetadata: ApiLambdaMetadata) {
    const { restApi } = apiManager;

    const route = this.generateApiResource(handlerMetadata);

    const Integration = handlerMetadata.integration
      ? ServiceIntegration
      : LambdaIntegration;
    const integration = new Integration({
      ...this.props,
      handlerMetadata,
      restApi,
      route,
    });

    await integration.create();
  }

  private generateApiResource = (handlerMetadata: ApiLambdaMetadata) => {
    const { apiMetadata } = this.props;
    const { apiRoutes, restApi } = apiManager;

    const fullPath = `${this.cleanPath(apiMetadata.path)}/${this.cleanPath(
      handlerMetadata.path
    )}`;

    if (apiRoutes[fullPath]) {
      return apiRoutes[fullPath];
    }

    if (fullPath === '/') {
      return restApi.root;
    }

    const resourceUrlList = fullPath.split('/');
    let principalApiResource = restApi.root;

    const paths = [];
    for (const resourceUrl of resourceUrlList) {
      paths.push(resourceUrl);
      const path = paths.join('/');
      if (apiRoutes[path]) {
        principalApiResource = apiRoutes[path];
        continue;
      }
      apiRoutes[path] = principalApiResource.addResource(resourceUrl);
      principalApiResource = apiRoutes[path];
    }

    apiManager.apiRoutes = principalApiResource;

    return apiRoutes[fullPath];
  };

  private cleanPath = (path: string) => {
    return path.replace(/^\//, '').replace(/\/$/, '');
  };
}
