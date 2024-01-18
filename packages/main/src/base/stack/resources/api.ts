import 'reflect-metadata';
import {
  JsonSchema,
  JsonSchemaType,
  LambdaIntegration,
  RestApi,
  RestApiProps,
  Model,
  RequestValidator,
  IResource,
  IntegrationResponse,
} from 'aws-cdk-lib/aws-apigateway';

import {
  ApiResourceMetadata,
  ApiLambdaMetadata,
  Source,
  ParamMetadata,
  Method,
} from '@really-less/api';
import { LambdaReflectKeys } from '@really-less/common';

import { Resource } from '../stack';
import { CommonResource, CommonResourceProps } from './common';

export interface ApiProps {
  name?: string;
  options?: RestApiProps;
}

interface ApiResourceProps extends CommonResourceProps {
  apiMetadata: ApiResourceMetadata;
  apiProps?: ApiProps;
  api?: RestApi;
  apiResources: Record<string, IResource>;
}

const schemaTypeMap: Record<string, JsonSchemaType> = {
  String: JsonSchemaType.STRING,
  Number: JsonSchemaType.NUMBER,
  Boolean: JsonSchemaType.BOOLEAN,
  Array: JsonSchemaType.ARRAY,
  Object: JsonSchemaType.OBJECT,
};

const requestTemplateMap: Record<Source, (key: string) => string> = {
  body: (key) => `$input.json('$.${key}')`,
  path: (key) => `$input.params().path.get('${key}')`,
  query: (key) => `$input.params('${key}')`,
  header: (key) => `$input.params('${key}')`,
};

const defaultResponses = (method: Method): IntegrationResponse[] => [
  {
    statusCode: method === Method.POST ? '201' : '200',
  },
  {
    statusCode: '401',
    selectionPattern: '.*UNAUTHORIZED*.',
  },
  {
    statusCode: '400',
    selectionPattern: '.*FAILED*.',
  },
  {
    statusCode: '404',
    selectionPattern: '.*NOT_FOUND*.',
  },
  {
    statusCode: '500',
    selectionPattern: '.*ERROR*.',
  },
];

export class ApiResource extends CommonResource {
  private apiProps?: ApiProps;
  private api: RestApi;
  private apiMetadata: ApiResourceMetadata;
  private resource: Resource;
  private apiResources: Record<string, IResource>;

  constructor(props: ApiResourceProps) {
    const {
      scope,
      api,
      apiProps,
      stackName,
      apiMetadata,
      resource,
      role,
      layer,
      apiResources,
    } = props;
    super(scope, stackName, role, layer);

    this.apiProps = apiProps;
    this.apiMetadata = apiMetadata;
    this.resource = resource;
    this.api = this.createApiRest(api);
    this.apiResources = apiResources;
  }

  generate() {
    const handlers: ApiLambdaMetadata[] = Reflect.getMetadata(
      LambdaReflectKeys.HANDLERS,
      this.resource.prototype
    );

    for (const handler of handlers) {
      const lambda = this.createLambda({
        pathName: this.apiMetadata.foldername,
        filename: this.apiMetadata.filename,
        handler,
        prefix: 'api-handler',
        excludeFiles: ['stepfunction', 'event'],
        role: this.role,
        layer: this.layer,
      });

      const { bodySchema, requestTemplate, requestParameters, requestValidations } =
        this.parseRequestArguments(handler);
      const apiResource = this.generateApiResource(handler);
      const response = defaultResponses(handler.method);

      apiResource.addMethod(
        handler.method,
        new LambdaIntegration(lambda, {
          proxy: false,
          integrationResponses: response,
          requestTemplates: requestTemplate
            ? {
                'application/json': requestTemplate,
              }
            : undefined,
        }),
        {
          requestParameters:
            Object.keys(requestParameters || {}).length > 0
              ? requestParameters
              : undefined,
          requestValidator:
            requestValidations?.validateRequestBody ||
            requestValidations?.validateRequestParameters
              ? new RequestValidator(this.scope, `${handler.name}-rv`, {
                  restApi: this.api,
                  requestValidatorName: `validator-${handler.name}`,
                  ...requestValidations,
                })
              : undefined,
          requestModels: bodySchema
            ? {
                'application/json': new Model(this.scope, `${handler.name}-request`, {
                  restApi: this.api,
                  schema: bodySchema,
                }),
              }
            : undefined,
          methodResponses: response.map((r) => ({
            statusCode: r.statusCode,
          })),
        }
      );
    }

    return this.api;
  }

  private createApiRest(api?: RestApi) {
    if (api) {
      return api;
    }

    return new RestApi(
      this.scope,
      this.apiProps?.name || `${this.stackName}-api`,
      this.apiProps?.options
    );
  }

  private parseRequestArguments(handler: ApiLambdaMetadata) {
    const params: Record<string, ParamMetadata[]> =
      Reflect.getMetadata(LambdaReflectKeys, this.resource.prototype) || {};

    const argsByMethod = params[handler.name];

    if (!argsByMethod) {
      return {};
    }

    const argsBySources: Partial<Record<Source, ParamMetadata[]>> = {};

    for (const arg of argsByMethod) {
      argsBySources[arg.source] ??= [];
      argsBySources[arg.source]?.push(arg);
    }

    const bodySchema = this.getBodySchema(argsBySources.body);

    const requestValidations = {
      validateRequestParameters:
        argsBySources.query !== undefined || argsBySources.path !== undefined,
      validateRequestBody:
        argsBySources.body !== undefined && Boolean(bodySchema?.required),
    };
    const requestParameters: Record<string, boolean> = {
      ...this.mapUrlParameters('querystring', argsBySources.query),
      ...this.mapUrlParameters('path', argsBySources.path),
    };

    return {
      bodySchema,
      requestParameters,
      requestValidations,
      requestTemplate: this.generateRequestTemplate(argsByMethod),
    };
  }

  private mapUrlParameters(type: 'querystring' | 'path', params: ParamMetadata[] = []) {
    return Object.fromEntries(
      params.map((param) => [`method.request.${type}.${param.name}`, param.required])
    );
  }

  private getBodySchema(params: ParamMetadata[] = []): JsonSchema {
    if (params.length === 0) {
      return {};
    }

    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];

    for (const field of params) {
      properties[field.name] = {
        type: schemaTypeMap[field.type] || JsonSchemaType.OBJECT,
      };
      field.required && required.push(field.name);
    }

    return {
      properties,
      required: required.length > 0 ? required : undefined,
      type: JsonSchemaType.OBJECT,
    };
  }

  private generateRequestTemplate(params: ParamMetadata[] = []) {
    const eventParams: string[] = [];
    const keyValues: string[] = [];
    if (params.length === 0) {
      return;
    }

    for (const param of params) {
      eventParams.push(
        `#set($${param.name} = ${requestTemplateMap[param.source](param.name)})`
      );
      // TODO: verify array and map list
      const paramValue = `$${param.name}`;
      let jsonField = `"${param.destinationField}": ${paramValue},`;
      if (!param.required) {
        jsonField = `#if($${param.name} && $${param.name}.length() > 0) ${jsonField} #end`;
      }
      keyValues.push(jsonField);
    }

    return `
      ${eventParams.join('\n')}
      {
        ${keyValues.join('\n')}
        "_stackName": "${this.stackName}"
      }
    `;
  }

  private generateApiResource = (handler: ApiLambdaMetadata) => {
    let fullPath = `${this.cleanPath(this.apiMetadata.path)}/${this.cleanPath(
      handler.path
    )}`;

    if (this.apiResources[fullPath]) {
      return this.apiResources[fullPath];
    }

    if (fullPath === '/') {
      return this.api.root;
    }

    const resourceUrlList = fullPath.split('/');
    let principalApiResource = this.api.root;

    let paths = [];
    for (const resourceUrl of resourceUrlList) {
      paths.push(resourceUrl);
      const path = paths.join('/');
      if (this.apiResources[path]) {
        principalApiResource = this.apiResources[path];
        continue;
      }
      this.apiResources[path] = principalApiResource.addResource(resourceUrl);
      principalApiResource = this.apiResources[path];
    }

    return this.apiResources[fullPath];
  };

  private cleanPath = (path: string) => {
    return path.replace(/^\//, '').replace(/\/$/, '');
  };
}
