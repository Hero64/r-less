import {
  ApiLambdaMetadata,
  ApiResourceMetadata,
  ParamMetadata,
  Source,
  IntegrationResponse,
} from '@really-less/api';
import {
  IResource,
  AwsIntegration,
  PassthroughBehavior,
} from 'aws-cdk-lib/aws-apigateway';

import { Resource } from '../../stack';
import { LambdaReflectKeys } from '@really-less/common';

interface ApiServiceIntegrationProps {
  handler: ApiLambdaMetadata;
  apiMetadata: ApiResourceMetadata;
  apiResource: IResource;
  resource: Resource;
}

const methodParamMap: Record<Source, string> = {
  query: 'method.request.querystring',
  path: 'method.request.path',
  body: 'method.request.body',
  header: 'method.request.header',
};

export class ApiServiceIntegration {
  constructor(private props: ApiServiceIntegrationProps) {}

  async create() {
    const { handler, resource: ResourceClass, apiResource } = this.props;

    const event = this.getMethodEvent();
    const resource: any = new ResourceClass();
    const integrationResponse: IntegrationResponse = await resource[handler.name](
      event,
      {}
    );

    switch (integrationResponse.type) {
      case 's3': {
        const requestParameters: Record<string, boolean> = {};

        for (const key in event) {
          requestParameters[event[key]] = true;
        }

        apiResource.addMethod(
          handler.method,
          new AwsIntegration({
            service: 's3',
            path: '{bucket}/{object}',
            integrationHttpMethod: handler.method,
            options: {
              // credentialsRole: // TODO: add role
              passthroughBehavior: PassthroughBehavior.WHEN_NO_TEMPLATES,
              requestParameters: {
                'integration.request.path.bucket': integrationResponse.options.bucket,
                'integration.request.path.object': integrationResponse.options.object,
                'integration.request.header.Accept': 'method.request.header.Accept',
              },
              integrationResponses: [
                {
                  statusCode: '200',
                  responseParameters: {
                    'method.request.header.Content-Type':
                      'integration.request.header.Content-Type',
                  },
                },
              ],
            },
          }),
          {
            requestParameters,
            methodResponses: [
              {
                statusCode: '200',
                responseParameters: {
                  'method.response.header.Content-Type': true,
                },
              },
            ],
          }
        );
        break;
      }
      default:
        throw new Error('Integration service not found');
    }
  }

  private getMethodEvent = () => {
    const { resource, handler } = this.props;

    const params: Record<string, ParamMetadata[]> =
      Reflect.getMetadata(LambdaReflectKeys.EVENT_PARAM, resource.prototype) || {};

    const paramsByMethod = params[handler.name];
    const event: Record<string, string> = {};
    if (Object.keys(paramsByMethod).length === 0) {
      return event;
    }

    for (const param of paramsByMethod) {
      event[param.destinationField] = `${methodParamMap[param.source]}.${param.name}`;
    }

    return event;
  };
}
