import type { LambdaGlobalConfig, ParserResolver } from '@really-less/common-resolver';
import { Role } from 'aws-cdk-lib/aws-iam';
import { LayerVersion } from 'aws-cdk-lib/aws-lambda';

export interface GlobalConfigProps {
  lambda: LambdaGlobalConfig;
  tags: string[];
}

export type ObjectResolver = Record<string, ParserResolver>;
