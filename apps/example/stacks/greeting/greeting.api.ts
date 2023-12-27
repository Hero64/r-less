import { Api, Get, Post, ApiEvent } from '@really-less/main';
import { GreetingField } from './greeting.field';

@Api({
  path: 'greeting/{id}',
})
export class GreetingApi {
  @Get({
    path: '/hello',
  })
  sayHello() {
    console.log('Hello');
  }

  @Post({
    path: '/bye',
  })
  sayBye(@ApiEvent(GreetingField) e: GreetingField) {
    console.log('Bye');
  }
}
