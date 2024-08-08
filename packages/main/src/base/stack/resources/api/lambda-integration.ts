import {
  IntegrationResponse,
  JsonSchema,
  JsonSchemaType,
  Model,
  RequestValidator,
  IResource,
  LambdaIntegration,
  IRestApi,
} from 'aws-cdk-lib/aws-apigateway';
import {
  ApiLambdaMetadata,
  ApiResourceMetadata,
  Method,
  ParamMetadata,
  Source,
} from '@really-less/api';
import { LambdaReflectKeys } from '@really-less/common';

import { Resource } from '../../stack';
import { CommonResource, CommonResourceProps } from '../common';
import { appManager } from '../../../../utils/manager';
import { getEnvironmentByResource } from '../../../env/env';

interface ApiLambdaIntegrationProps extends CommonResourceProps {
  handler: ApiLambdaMetadata;
  apiMetadata: ApiResourceMetadata;
  apiResource: IResource;
  resource: Resource;
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

export class ApiLambdaIntegration extends CommonResource {
  constructor(private props: ApiLambdaIntegrationProps) {
    super(props.scope, props.stackName);
  }

  create() {
    const { apiMetadata, handler, apiResource, scope } = this.props;
    const { api } = appManager.resources[this.stackName];

    console.log(getEnvironmentByResource(this.props.stackName, handler.lambda?.env));

    const lambda = this.createLambda({
      pathName: apiMetadata.foldername,
      filename: apiMetadata.filename,
      handler: handler,
      prefix: 'api-handler',
      excludeFiles: ['stepfunction', 'event'],
      env: getEnvironmentByResource(this.props.stackName, handler.lambda?.env),
    });

    const { bodySchema, requestTemplate, requestParameters, requestValidations } =
      this.parseRequestArguments(handler);

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
          Object.keys(requestParameters || {}).length > 0 ? requestParameters : undefined,
        requestValidator:
          requestValidations?.validateRequestBody ||
          requestValidations?.validateRequestParameters
            ? new RequestValidator(this.scope, `${handler.name}-rv`, {
                restApi: api as IRestApi,
                requestValidatorName: `validator-${handler.name}`,
                ...requestValidations,
              })
            : undefined,
        requestModels: bodySchema
          ? {
              'application/json': new Model(scope, `${handler.name}-request`, {
                restApi: api as IRestApi,
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

  private parseRequestArguments(handler: ApiLambdaMetadata) {
    const { resource } = this.props;

    const params: Record<string, ParamMetadata[]> =
      Reflect.getMetadata(LambdaReflectKeys.EVENT_PARAM, resource.prototype) || {};

    const paramsByMethod = params[handler.name];

    if (!paramsByMethod) {
      return {};
    }

    const paramsBySource: Partial<Record<Source, ParamMetadata[]>> = {};

    for (const arg of paramsByMethod) {
      paramsBySource[arg.source] ??= [];
      paramsBySource[arg.source]?.push(arg);
    }

    const bodySchema = this.getBodySchema(paramsBySource.body);

    const requestValidations = {
      validateRequestParameters:
        paramsBySource.query !== undefined || paramsBySource.path !== undefined,
      validateRequestBody:
        paramsBySource.body !== undefined && Boolean(bodySchema?.required),
    };
    const requestParameters: Record<string, boolean> = {
      ...this.mapUrlParameters('querystring', paramsBySource.query),
      ...this.mapUrlParameters('path', paramsBySource.path),
    };

    return {
      bodySchema,
      requestParameters,
      requestValidations,
      requestTemplate: this.generateRequestTemplate(paramsByMethod),
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
}
