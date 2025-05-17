import { ParserResolver } from '@really-less/common-resolver';
import { RESOURCE_TYPE } from '@really-less/api';

import { parser } from './parser/parser';

export const ApiResolver: ParserResolver = {
  type: RESOURCE_TYPE,
  parser,
};
