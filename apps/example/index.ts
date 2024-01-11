import { createApp } from '@really-less/resolver';

import GreetingStack from './stacks/greeting/greeting.stack';

createApp({
  name: 'example',
  stacks: [GreetingStack],
  global: {},
});
