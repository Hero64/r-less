import { createApp } from '@really-less/main';
import { ApiResolver } from '@really-less/api-resolver';
import { StepFunctionResolver } from '@really-less/step-function-resolver';
import { EventResolver } from '@really-less/event-resolver';

import GreetingStack from './stacks/greeting/greeting.stack';

createApp({
  name: 'example',
  stacks: [GreetingStack],
  resolvers: [new ApiResolver(), new StepFunctionResolver(), new EventResolver()],
});
