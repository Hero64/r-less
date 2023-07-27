import { Api, Argument, Get, Post, Event } from '@really-less/main';

class Request {
  @Argument({
    field: 'name',
    required: false,
    source: 'body',
  })
  name: string;

  @Argument({
    field: 'lastname',
    required: false,
    source: 'body',
  })
  lastName: string;
}

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
  sayBye(@Event(Request) e: Request) {
    console.log('Bye');
  }
}
