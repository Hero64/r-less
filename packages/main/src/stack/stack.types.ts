import type { ClassResource } from '@really-less/common';
import type { GlobalConfig } from '../app/app.types';

export interface CreateStackProps {
  name: string;
  resources: ClassResource[];
  globalConfig?: GlobalConfig;
}
