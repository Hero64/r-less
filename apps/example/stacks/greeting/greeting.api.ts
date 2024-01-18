import { Api, Get, Post, Event } from '@really-less/api';
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
  sayBye(@Event(GreetingField) e: GreetingField) {
    console.log('Bye');
  }
}
