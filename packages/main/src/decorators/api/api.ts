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
  /**
   * original name of field
   *
   * @default string name of field class property
   */
  field?: string;
  /**
   * specify field is required
   * @default true
   */
  required?: boolean;
  /**
   * source to obtain field value
   * @default path
   */
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

export const ApiEvent = createEventDecorator((FieldClass) => {
  return Reflect.getMetadata(ApiReflectKeys.FIELD, FieldClass.prototype);
});

export const ApiField =
  (props: ApiFieldProps = {}) =>
  (target: any, propertyKey: string) => {
    const { source = 'query', required = true, field } = props;
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
