import 'reflect-metadata';
import { createLambdaDecorator, createResourceDecorator } from '@really-less/common';
import {
  type ApiLambdaMetadata,
  type ApiLambdaProps,
  type ApiProps,
  Method,
} from './api.types';

export const RESOURCE_TYPE = 'API';

const createMethodDecorator = (method: Method) =>
  createLambdaDecorator<ApiLambdaProps, ApiLambdaMetadata>({
    getLambdaMetadata: (params, methodName) => {
      const { lambda, path = '/', integration = false } = params;

      return {
        lambda,
        method,
        path,
        integration,
        name: methodName,
      };
    },
  });

export const Api = createResourceDecorator<ApiProps>({
  type: RESOURCE_TYPE,
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
