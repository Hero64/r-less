import { createStack } from '@really-less/main';

import { GreetingApi } from './greeting.api';

export default createStack({
  name: 'greeting',
  resources: [GreetingApi],
});
