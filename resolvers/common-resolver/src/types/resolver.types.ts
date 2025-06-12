import type { ClassResource } from '@really-less/common';
import type { NestedStack, Stack } from 'aws-cdk-lib';

import type { IRole } from 'aws-cdk-lib/aws-iam';
import type { ILayerVersion } from 'aws-cdk-lib/aws-lambda';

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
  stackResource: ClassResource;
}

export interface ParserResolver {
  type: string;
  initAppResources?: (scope: Stack, appName: string) => void;
  parser: (props: CommonResolverProps) => Promise<void>;
}
