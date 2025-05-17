import { CommonResolverProps } from '@really-less/common-resolver';

import { StepFunctionResourceMetadata } from '@really-less/step_function';

export interface StepFunctionResourceProps extends CommonResolverProps {
  stepFunctionMetadata: StepFunctionResourceMetadata;
}
