import type { ResourceMetadata } from '@really-less/common';
import type { CommonResolverProps } from '@really-less/common-resolver';

import { EventCronMetadata, EventRuleMetadata } from '@really-less/event';

export interface EventResourceProps extends CommonResolverProps {
  eventMetadata: ResourceMetadata;
}
