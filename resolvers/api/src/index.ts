import type { CommonResolverProps, ParserResolver } from '@really-less/common-resolver';
import {
  type ApiLambdaMetadata,
  type ApiResourceMetadata,
  RESOURCE_TYPE,
} from '@really-less/api';
import { LambdaReflectKeys, ResourceReflectKeys } from '@really-less/common';
import type { Stack } from 'aws-cdk-lib';

import { ApiParserResolver } from './api/api';
import { apiManager } from './manager/manger';
import type { RestApiOptions } from './manager/manager.types';

export class ApiResolver implements ParserResolver {
  public type = RESOURCE_TYPE;
  constructor(protected options: RestApiOptions[] = []) {}

  public initAppResources(scope: Stack, name: string) {
    apiManager.setRestApis(this.options, scope, name);
  }

  public async parser(props: CommonResolverProps) {
    const { stackResource } = props;

    const apiMetadata: ApiResourceMetadata = Reflect.getMetadata(
      ResourceReflectKeys.RESOURCE,
      stackResource
    );
    const handlers: ApiLambdaMetadata[] = Reflect.getMetadata(
      LambdaReflectKeys.HANDLERS,
      stackResource.prototype
    );

    const apiParserResolver = new ApiParserResolver({
      ...props,
      apiMetadata,
    });

    for (const handler of handlers) {
      await apiParserResolver.addRoute(handler);
    }
  }
}
