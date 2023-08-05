import { createStack } from '@really-less/main';

import { GreetingApi } from './greeting.api';
import { GreetingStepFunction } from './greeting.stepfunction';

export default createStack({
  name: 'greeting',
  resources: [GreetingApi, GreetingStepFunction],
});
