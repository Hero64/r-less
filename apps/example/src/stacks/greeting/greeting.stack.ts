import { createStack } from '@really-less/main';

import { GreetingApi } from './greeting.api';
import { GreetingStepFunction } from './greeting.stepfunction';
import { GreetingEvent } from './greeting.event';

export default createStack({
  name: 'greeting',
  resources: [GreetingApi, GreetingStepFunction, GreetingEvent],
});
