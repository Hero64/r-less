import 'reflect-metadata';
import {
  LambdaMetadata,
  LambdaProps,
  createEventDecorator,
  createLambdaDecorator,
} from '../lambda/lambda';
import {
  ResourceMetadata,
  ResourceType,
  ResourceProps,
  createResourceDecorator,
} from '../resource/resource';

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

export type ApiFieldSource = 'body' | 'path' | 'query' | 'header';

export interface ApiFieldProps {
  field?: string;
  required?: boolean;
  source?: ApiFieldSource;
}

export interface ApiFieldMetadata extends Required<ApiFieldProps> {
  destinationField: string;
  type: string;
}

export enum Method {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

export enum ApiReflectKeys {
  FIELD = 'api:field',
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

export const Api = createResourceDecorator<ApiProps>(
  ResourceType.API,
  ({ path }) => ({
    path: path || '/',
  }),
  5
);

export const Get = createMethodDecorator(Method.GET);
export const Post = createMethodDecorator(Method.POST);
export const Put = createMethodDecorator(Method.PUT);
export const Patch = createMethodDecorator(Method.PATCH);
export const Delete = createMethodDecorator(Method.DELETE);

export const ApiEvent = createEventDecorator((FieldClass) => {
  return Reflect.getMetadata(ApiReflectKeys.FIELD, FieldClass.prototype);
});

export const ApiField =
  (props: ApiFieldProps = {}) =>
  (target: any, propertyKey: string) => {
    const { source = 'body', required = true, field } = props;
    const apiFieldMetadata: ApiFieldMetadata[] =
      Reflect.getMetadata(ApiReflectKeys.FIELD, target) || [];

    const type = Reflect.getMetadata('design:type', target, propertyKey).name;

    apiFieldMetadata.push({
      type,
      source,
      required,
      field: field ?? propertyKey,
      destinationField: propertyKey,
    });
    Reflect.defineMetadata(ApiReflectKeys.FIELD, apiFieldMetadata, target);
  };
