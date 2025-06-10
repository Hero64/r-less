import type { ParserResolver } from '@really-less/common-resolver';

import { parser } from './parser/parser';
import { RESOURCE_TYPE } from '@really-less/event';

export const EventResolver: ParserResolver = {
  type: RESOURCE_TYPE,
  parser,
};
