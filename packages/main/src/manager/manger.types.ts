import type { LambdaGlobalConfig, ParserResolver } from '@really-less/common-resolver';

export interface GlobalConfigProps {
  lambda: LambdaGlobalConfig;
  tags: string[];
}

export type ObjectResolver = Record<string, ParserResolver>;
