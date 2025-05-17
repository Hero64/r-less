import {
  LambdaMetadata,
  LambdaProps,
  ResourceMetadata,
  ResourceProps,
} from '@really-less/common';

export interface ApiLambdaProps {
  path?: string;
  lambda?: LambdaProps;
  integration?: boolean;
}

export interface ApiProps extends ResourceProps {
  path?: string;
}

export interface ApiResourceMetadata extends Required<ApiProps>, ResourceMetadata {
  apiGatewayName?: string;
}

export interface ApiLambdaMetadata extends LambdaMetadata {
  path: string;
  method: Method;
  name: string;
  integration: boolean;
  lambda?: LambdaProps;
}

export enum Method {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

export const methodStatusCode: Record<Method, number> = {
  GET: 200,
  DELETE: 200,
  PATCH: 200,
  POST: 201,
  PUT: 200,
};

export enum ApiReflectKeys {
  FIELD = 'api:field',
}
