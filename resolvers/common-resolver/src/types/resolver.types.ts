import { App, NestedStack, Stack } from 'aws-cdk-lib';

import { IRole } from 'aws-cdk-lib/aws-iam';
import { ILayerVersion } from 'aws-cdk-lib/aws-lambda';
import { StackResource } from './resource.type';

export interface LambdaGlobalConfig {
  role?: IRole;
  env?: Record<string, any>;
}

export interface ResolverProps {
  lambdaGlobalConfig: LambdaGlobalConfig;
}

export interface AppResolverProps extends ResolverProps {
  name: string;
  scope: Stack;
  layer?: ILayerVersion;
  env: Record<string, any>;
}

export interface NestedStackResolverProps extends ResolverProps {
  name: string;
  scope: NestedStack;
}

export interface CommonResolverProps {
  app: AppResolverProps;
  nestedStack: NestedStackResolverProps;
  stackResource: StackResource;
}

export interface ParserResolver {
  type: string;
  parser: (props: CommonResolverProps) => Promise<void>;
}
