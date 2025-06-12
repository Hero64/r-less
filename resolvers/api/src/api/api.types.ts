import type { ApiResourceMetadata } from '@really-less/api';
import type { CommonResolverProps } from '@really-less/common-resolver';

export interface ApiResolverProps extends CommonResolverProps {
  apiMetadata: ApiResourceMetadata;
}
