import type { ServicesValues } from '@really-less/common';
import type { ParserResolver, EnvironmentResource } from '@really-less/common-resolver';

export interface LambdaGlobalProps {
  env?: EnvironmentResource;
  services?: ServicesValues[];
}

export interface GlobalConfig {
  lambda?: LambdaGlobalProps;
  tags?: string[];
}

export interface CreateAppProps {
  name: string;
  stacks: (() => Promise<void>)[];
  resolvers: ParserResolver[];
  globalConfig?: GlobalConfig;
}
