import 'reflect-metadata';
import {
  LambdaMetadata,
  LambdaProps,
  createLambdaDecorator,
  ResourceMetadata,
  ResourceType,
  ResourceProps,
  createResourceDecorator,
} from '@really-less/common';

export interface ApiLambdaProps {
  path?: string;
  lambda?: LambdaProps;
  error?: string;
}

export interface ApiProps extends ResourceProps {
  path?: string;
}

export interface ApiResourceMetadata extends Required<ApiProps>, ResourceMetadata {}

export interface ApiLambdaMetadata extends LambdaMetadata {
  path: string;
  method: Method;
  name: string;
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

const createMethodDecorator = (method: Method) =>
  createLambdaDecorator<ApiLambdaProps, ApiLambdaMetadata>(
    (params, methodName) => {
      const { path = '/', lambda } = params;

      return {
        lambda,
        method,
        path,
        name: methodName,
      };
    },
    (callback, response, isError) => {
      if (isError) {
        const isMessage = typeof response === 'string';
        let selectResponseType = isMessage ? 'ERROR' : 'NOT_FOUND';
        if (isMessage) {
          selectResponseType =
            ['UNAUTHORIZED', 'NOT_FOUND', 'FAILED'].find((m) => m.includes(response)) ||
            selectResponseType;
        }

        callback(
          selectResponseType,
          isMessage
            ? {
                message: response,
              }
            : response
        );
      }

      callback(null, response);
    }
  );

export const Api = createResourceDecorator<ApiProps>({
  type: ResourceType.API,
  callerFileIndex: 5,
  getMetadata: ({ path }) => ({
    path: path || '/',
  }),
});

export const Get = createMethodDecorator(Method.GET);
export const Post = createMethodDecorator(Method.POST);
export const Put = createMethodDecorator(Method.PUT);
export const Patch = createMethodDecorator(Method.PATCH);
export const Delete = createMethodDecorator(Method.DELETE);
