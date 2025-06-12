import type { IResource, RestApi } from 'aws-cdk-lib/aws-apigateway';
import type { ApiLambdaMetadata } from '@really-less/api';

import type { ApiResolverProps } from '../api.types';

export interface Integration {
  create: () => void;
}

export interface IntegrationProps extends ApiResolverProps {
  handlerMetadata: ApiLambdaMetadata;
  route: IResource;
  restApi: RestApi;
}
