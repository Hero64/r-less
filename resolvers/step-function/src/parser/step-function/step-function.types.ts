import type { CommonResolverProps } from '@really-less/common-resolver';

import type { StepFunctionResourceMetadata } from '@really-less/step_function';

export interface StepFunctionResourceProps extends CommonResolverProps {
  stepFunctionMetadata: StepFunctionResourceMetadata;
}
