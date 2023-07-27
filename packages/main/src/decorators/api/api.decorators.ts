import 'reflect-metadata';
import { ArgumentReflectKeys } from '../argument/argument.decorators';
import { dirname, basename } from 'node:path';

import { getCallerFileName } from '../../utils/path';
import { REALLY_LESS_BUILD } from '../../constants/env.constants';
import {
  LambdaMetadata,
  LambdaProps,
  createEventDecorator,
  createLambdaDecorator,
} from '../lambda/lambda.decorators';

export interface ApiLambdaProps {
  path?: string;
  lambda?: LambdaProps;
  error?: string;
}

export interface ApiProps {
  name?: string;
  path?: string;
}

export interface ApiMetadata {
  name: string;
  path: string;
  filename: string;
  foldername: string;
  type: ResourceType;
}

export interface ApiLambdaMetadata extends LambdaMetadata {
  path: string;
  method: Method;
  name: string;
  lambda?: LambdaProps;
}

export enum ResourceType {
  API,
  EVENT,
  STEP_FUNCTION,
}

export enum PropertyTypes {
  EVENT,
  CALLBACK,
}

export enum Method {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

export enum ApiReflectKeys {
  RESOURCE = 'api:resource',
}

const createMethodDecorator = (method: Method) =>
  createLambdaDecorator<ApiLambdaProps, ApiLambdaMetadata>((params, methodName) => {
    const { path = '/', lambda } = params;

    return {
      lambda,
      method,
      path,
      name: methodName,
    };
  });

export const Api =
  (props: ApiProps = {}) =>
  (constructor: Function) => {
    if (!process.env[REALLY_LESS_BUILD]) {
      return;
    }
    const { name = constructor.name, path = '/' } = props;

    const callerFile = getCallerFileName();

    Reflect.defineMetadata(
      ApiReflectKeys.RESOURCE,
      {
        name,
        path,
        type: ResourceType.API,
        foldername: dirname(callerFile),
        filename: basename(callerFile).replace('.js', ''),
      },
      constructor
    );
  };

export const Get = createMethodDecorator(Method.GET);
export const Post = createMethodDecorator(Method.POST);
export const Put = createMethodDecorator(Method.PUT);
export const Patch = createMethodDecorator(Method.PATCH);
export const Delete = createMethodDecorator(Method.DELETE);

export const ApiEvent = createEventDecorator((FieldClass) => {
  return Reflect.getMetadata(ArgumentReflectKeys.PROPERTIES, FieldClass.prototype);
});
