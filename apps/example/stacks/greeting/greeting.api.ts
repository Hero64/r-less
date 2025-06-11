import { Api, Get, Post, Event, type IntegrationResponse } from '@really-less/api';
import dayjs from 'dayjs';

import { GreetingField, IntegrationEvent } from './greeting.field';

@Api({
  path: 'greeting/{id}',
})
export class GreetingApi {
  @Get({
    path: '/hello',
  })
  sayHello() {
    console.log('Hello', dayjs().format('DD-MM-YYYY'));
  }

  @Post({
    path: '/bye',
  })
  sayBye(@Event(GreetingField) e: GreetingField) {
    console.log('Bye', e);
  }

  /* @Get({
    path: '/{bucket}/{key}',
    integration: true,
  })
  async getS3Data(
    @Event(IntegrationEvent) e: IntegrationEvent
  ): Promise<IntegrationResponse> {
    return {
      type: 's3',
      options: {
        bucket: e.bucket,
        object: e.key,
      },
    };
  } */
}
