import { IResource, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Role } from 'aws-cdk-lib/aws-iam';

import { AppResources } from '../base';

export interface StackResources {
  api: RestApi;
  role: Role;
  apiResources: Record<string, IResource>;
  env: Record<string, any>;
}

class AppManager {
  public resources: Record<string, StackResources> = {};
  public global: AppResources;

  setAppResources(resources: AppResources) {
    this.global = resources;
  }

  upsertResource(name: string, resources: Partial<StackResources> = {}) {
    this.resources[name] = {
      ...this.resources[name],
      ...resources,
    };
  }
}

export const appManager = new AppManager();
