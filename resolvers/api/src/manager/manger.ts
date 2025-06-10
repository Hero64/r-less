import { RestApi, type IResource } from 'aws-cdk-lib/aws-apigateway';

import type { ManagerInitializeProps } from './manager.types';

class ApiManager {
  private apis: Record<string, RestApi> = {};
  private routes: Record<string, Record<string, IResource>> = {};
  private props: ManagerInitializeProps;

  initialize(props: ManagerInitializeProps) {
    this.props = props;
  }

  get restApi() {
    this.validateProps();

    const { apiName, appScope } = this.props;
    const api = this.apis[apiName];

    if (api) {
      return api;
    }

    this.apis = {
      ...this.apis,
      [apiName]: new RestApi(appScope, apiName, {
        restApiName: apiName,
      }),
    };

    return this.apis[apiName];
  }

  get apiRoutes(): Record<string, IResource> {
    this.validateProps();

    return this.routes[this.props.apiName] || {};
  }

  set apiRoutes(routes: Record<string, IResource>) {
    this.validateProps();

    this.routes[this.props.apiName] = {
      ...this.routes[this.props.apiName],
      ...routes,
    };
  }

  private validateProps() {
    if (this.props === undefined) {
      throw new Error('You must initialize the manager before');
    }
  }
}

export const apiManager = new ApiManager();
