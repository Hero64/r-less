import 'reflect-metadata';

import type { CommonResolverProps } from '@really-less/common-resolver';
import type { ApiLambdaMetadata, ApiResourceMetadata } from '@really-less/api';
import { LambdaReflectKeys, ResourceReflectKeys } from '@really-less/common';

import { ApiResolver } from './api/api';

export const parser = async (props: CommonResolverProps) => {
  const { stackResource } = props;

  const apiMetadata: ApiResourceMetadata = Reflect.getMetadata(
    ResourceReflectKeys.RESOURCE,
    stackResource
  );
  const handlers: ApiLambdaMetadata[] = Reflect.getMetadata(
    LambdaReflectKeys.HANDLERS,
    stackResource.prototype
  );

  const apiResolver = new ApiResolver({
    ...props,
    apiMetadata,
  });

  for (const handler of handlers) {
    await apiResolver.addRoute(handler);
  }
};
