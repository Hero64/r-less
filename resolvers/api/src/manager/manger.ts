import { RestApi, type IResource } from 'aws-cdk-lib/aws-apigateway';
import type { Role } from 'aws-cdk-lib/aws-iam';
import type { Stack } from 'aws-cdk-lib';
import type { S3Permissions } from '@really-less/common';
import { createRole } from '@really-less/common-resolver';

import type { ManagerInitializeProps, RestApiOptions } from './manager.types';

type ServiceStackRole = 's3Read' | 's3Write';
const permissionsByRole: Record<ServiceStackRole, S3Permissions[]> = {
  s3Read: ['GetObject'],
  s3Write: ['GetObject', 'PutObject'],
};

class ApiManager {
  private apis: Record<string, RestApi> = {};
  private routes: Record<string, Record<string, IResource>> = {};
  private props: ManagerInitializeProps;
  private serviceRoles: Partial<Record<ServiceStackRole, Role>> = {};

  initialize(props: ManagerInitializeProps) {
    this.props = props;
  }

  setRestApis(apis: RestApiOptions[], scope: Stack, name: string) {
    if (Object.keys(this.apis).length > 0) {
      return;
    }

    if (apis.length === 0) {
      const restApiName = `${name}-api`;
      this.apis = {
        [restApiName]: new RestApi(scope, restApiName, {
          restApiName: restApiName,
        }),
      };
    }

    for (const api of apis) {
      this.apis[api.restApiName] = new RestApi(scope, api.restApiName, api);
    }
  }

  get restApi() {
    this.validateProps();

    const { apiName } = this.props;
    const api = this.apis[apiName];

    if (!api) {
      throw new Error(
        `API ${apiName} edoes not exist, please verify that it is included in the API resolver config.`
      );
    }
    return api;
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

  getRole(service: ServiceStackRole) {
    if (this.serviceRoles[service]) {
      return this.serviceRoles[service];
    }
  }

  setServiceRole(service: ServiceStackRole, principal: string, scope: Stack) {
    this.serviceRoles[service] = createRole({
      scope,
      services: [
        {
          type: 's3',
          permissions: permissionsByRole[service],
        },
      ],
      principal,
    });

    return this.serviceRoles[service];
  }

  private validateProps() {
    if (this.props === undefined) {
      throw new Error('You must initialize the manager before');
    }
  }
}

export const apiManager = new ApiManager();
