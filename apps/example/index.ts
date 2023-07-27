import { createApp } from '@really-less/main';

import GreetingStack from './stacks/greeting/greeting.stack';

createApp({
  name: 'example',
  stacks: [GreetingStack],
});
