import type { ResourceMetadata } from '@really-less/common';
import type { CommonResolverProps } from '@really-less/common-resolver';

export interface EventResourceProps extends CommonResolverProps {
  eventMetadata: ResourceMetadata;
}
