import type { ParamMetadata, Source, IntegrationResponse } from '@really-less/api';
import { AwsIntegration, PassthroughBehavior } from 'aws-cdk-lib/aws-apigateway';

import { LambdaReflectKeys } from '@really-less/common';

import type { Integration, IntegrationProps } from './integration.types';
import { apiManager } from '../../../manager/manger';

const methodParamMap: Record<Source, string> = {
  query: 'method.request.querystring',
  path: 'method.request.path',
  body: 'method.request.body',
  header: 'method.request.header',
};

export class ServiceIntegration implements Integration {
  constructor(private props: IntegrationProps) {}

  async create() {
    const { stackResource: ResourceClass, handlerMetadata, route } = this.props;

    const event = this.getMethodEvent();
    const resource: any = new ResourceClass();
    const integrationResponse: IntegrationResponse = await resource[handlerMetadata.name](
      event,
      {}
    );

    switch (integrationResponse.type) {
      case 's3': {
        const requestParameters: Record<string, boolean> = {};

        for (const key in event) {
          requestParameters[event[key]] = true;
        }
        let integrationRole = apiManager.getRole('s3Read');
        if (!integrationRole) {
          integrationRole = apiManager.setServiceRole(
            's3Read',
            'apigateway.amazonaws.com',
            this.props.nestedStack.scope
          );
        }

        route.addMethod(
          handlerMetadata.method,
          new AwsIntegration({
            service: 's3',
            path: '{bucket}/{object}',
            integrationHttpMethod: handlerMetadata.method,
            options: {
              credentialsRole: integrationRole,
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
    const { stackResource, handlerMetadata } = this.props;

    const params: Record<string, ParamMetadata[]> =
      Reflect.getMetadata(LambdaReflectKeys.EVENT_PARAM, stackResource.prototype) || {};

    const paramsByMethod = params[handlerMetadata.name];
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
