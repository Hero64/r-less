import 'reflect-metadata';
import { NestedStack } from 'aws-cdk-lib';
import {
  JsonSchema,
  JsonSchemaType,
  LambdaIntegration,
  RestApi,
  RestApiProps,
  Model,
  RequestValidator,
  IResource,
} from 'aws-cdk-lib/aws-apigateway';

import {
  ApiResourceMetadata,
  ApiLambdaMetadata,
  ApiFieldSource,
  ApiFieldMetadata,
} from '../../../decorators';
import { Resource } from '../stack';
import { CommonResource } from './common';
import { LambdaReflectKeys } from 'decorators/lambda/lambda';

export interface ApiProps {
  name?: string;
  options?: RestApiProps;
}

interface ApiResourceProps {
  scope: NestedStack;
  resource: Resource;
  stackName: string;
  apiMetadata: ApiResourceMetadata;
  apiProps?: ApiProps;
  api?: RestApi;
}

const schemaTypeMap: Record<string, JsonSchemaType> = {
  String: JsonSchemaType.STRING,
  Number: JsonSchemaType.NUMBER,
  Boolean: JsonSchemaType.BOOLEAN,
};

const requestTemplateMap: Record<ApiFieldSource, (key: string) => string> = {
  body: (key) => `$input.json('$.${key}')`,
  path: (key) => `$input.path('${key}')`,
  query: (key) => `$input.params('${key}')`,
  header: (key) => `$input.params('${key}')`,
};

export class ApiResource extends CommonResource {
  private apiProps?: ApiProps;
  private api: RestApi;
  private apiMetadata: ApiResourceMetadata;
  private resource: Resource;
  private apiResources: Record<string, IResource> = {};

  constructor(props: ApiResourceProps) {
    const { scope, api, apiProps, stackName, apiMetadata, resource } = props;
    super(scope, stackName);

    this.apiProps = apiProps;
    this.apiMetadata = apiMetadata;
    this.resource = resource;
    this.api = this.createApiRest(api);
  }

  generate() {
    const handlers: ApiLambdaMetadata[] = Reflect.getMetadata(
      LambdaReflectKeys.HANDLERS,
      this.resource.prototype
    );

    for (const handler of handlers) {
      const lambda = this.createLambda(
        this.apiMetadata.foldername,
        this.apiMetadata.filename,
        handler
      );

      const { bodySchema, requestTemplate, requestParameters, requestValidations } =
        this.parseRequestArguments(handler);
      const apiResource = this.generateApiResource(handler);
      apiResource.addMethod(
        handler.method,
        new LambdaIntegration(lambda, {
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
    const args: Record<string, ApiFieldMetadata[]> =
      Reflect.getMetadata(LambdaReflectKeys.ARGUMENTS, this.resource.prototype) || {};

    const argsByMethod = args[handler.name];

    if (!argsByMethod) {
      return {};
    }

    const argsBySources: Partial<Record<ApiFieldSource, ApiFieldMetadata[]>> = {};

    for (const arg of argsByMethod) {
      argsBySources[arg.source] ??= [];
      argsBySources[arg.source]?.push(arg);
    }

    const requestValidations = {
      validateRequestParameters:
        argsBySources.query !== undefined || argsBySources.path !== undefined,
      validateRequestBody: argsBySources.body !== undefined,
    };
    const requestParameters: Record<string, boolean> = {
      ...this.mapUrlParameters('querystring', argsBySources.query),
      ...this.mapUrlParameters('path', argsBySources.path),
    };

    const bodySchema = this.getBodySchema(argsBySources.body);

    return {
      bodySchema,
      requestParameters,
      requestValidations,
      requestTemplate: this.generateRequestTemplate(argsByMethod),
    };
  }

  private mapUrlParameters(
    type: 'querystring' | 'path',
    fields: ApiFieldMetadata[] = []
  ) {
    return Object.fromEntries(
      fields.map((field) => [`method.request.${type}.${field.field}`, field.required])
    );
  }

  private getBodySchema(fields: ApiFieldMetadata[] = []): JsonSchema {
    if (fields.length === 0) {
      return {};
    }

    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];

    for (const field of fields) {
      properties[field.field] = {
        type: schemaTypeMap[field.type],
      };
      field.required && required.push(field.field);
    }

    return {
      properties,
      type: JsonSchemaType.OBJECT,
    };
  }

  private generateRequestTemplate(args: ApiFieldMetadata[] = []) {
    const variables: string[] = [];
    const keyValues: string[] = [];
    if (args.length === 0) {
      return;
    }

    for (const arg of args) {
      variables.push(
        `#set($${arg.field} = ${requestTemplateMap[arg.source](arg.field)})`
      );
      let jsonField = `"${arg.destinationField}": $${arg.field},`;
      if (!arg.required) {
        jsonField = `#if($${arg.field}) ${jsonField} #end`;
      }
      keyValues.push(jsonField);
    }

    return `
      ${variables.join('\n')}
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
    }

    return this.apiResources[fullPath];
  };

  private cleanPath = (path: string) => {
    return path.replace(/^\//, '').replace(/\/$/, '');
  };
}
