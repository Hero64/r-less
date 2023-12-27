import { createStack } from '@really-less/resolver';

import { GreetingApi } from './greeting.api';
import { GreetingStepFunction } from './greeting.stepfunction';
import { GreetingEvent } from './greeting.event';

export default createStack({
  name: 'greeting',
  resources: [GreetingApi, GreetingStepFunction, GreetingEvent],
});
