import { Api, ApiField, Get, Post, ApiEvent } from '@really-less/main';

class Request {
  @ApiField({
    field: 'name',
    required: false,
    source: 'body',
  })
  name: string;

  @ApiField({
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
  sayBye(@ApiEvent(Request) e: Request) {
    console.log('Bye');
  }
}
