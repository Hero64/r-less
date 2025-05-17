import { ParserResolver } from '@really-less/common-resolver';
import { RESOURCE_TYPE } from '@really-less/step_function';

import { parser } from './parser/parser';

export const StepFunctionResolver: ParserResolver = {
  type: RESOURCE_TYPE,
  parser,
};
