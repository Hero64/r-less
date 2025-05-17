import { ApiResourceMetadata } from '@really-less/api';
import { CommonResolverProps } from '@really-less/common-resolver';

export interface ApiResolverProps extends CommonResolverProps {
  apiMetadata: ApiResourceMetadata;
}
