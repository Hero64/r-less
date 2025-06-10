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
    const { restApi, apiRoutes } = apiManager;

    const routes = { ...apiRoutes };

    const fullPath = `${this.cleanPath(apiMetadata.path)}/${this.cleanPath(
      handlerMetadata.path
    )}`;

    if (routes[fullPath]) {
      return routes[fullPath];
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
      if (routes[path]) {
        principalApiResource = routes[path];
        continue;
      }

      routes[path] = principalApiResource.addResource(resourceUrl);
      principalApiResource = routes[path];
    }

    apiManager.apiRoutes = routes;

    return routes[fullPath];
  };

  private cleanPath = (path: string) => {
    return path.replace(/^\//, '').replace(/\/$/, '');
  };
}
