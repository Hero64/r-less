import type { StackResource } from '@really-less/common-resolver';
import type { GlobalConfig } from '../app/app.types';

export interface CreateStackProps {
  name: string;
  resources: StackResource[];
  globalConfig?: GlobalConfig;
}
