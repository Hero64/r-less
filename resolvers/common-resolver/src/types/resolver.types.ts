import type { NestedStack, Stack } from 'aws-cdk-lib';

import type { IRole, Role } from 'aws-cdk-lib/aws-iam';
import type { ILayerVersion } from 'aws-cdk-lib/aws-lambda';
import type { StackResource } from './resource.type';

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
