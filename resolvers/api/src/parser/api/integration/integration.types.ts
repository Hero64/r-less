import { IResource, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { ApiLambdaMetadata } from '@really-less/api';

import { ApiResolverProps } from '../api.types';

export interface Integration {
  create: () => void;
}

export interface IntegrationProps extends ApiResolverProps {
  handlerMetadata: ApiLambdaMetadata;
  route: IResource;
  restApi: RestApi;
}
