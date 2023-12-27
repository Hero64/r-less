import { Event, EventCron, EventRule } from '@really-less/main';

@Event()
export class GreetingEvent {
  @EventRule({
    rule: 'say-hello',
  })
  sayHello() {
    console.log('Hello');
  }

  @EventCron({
    schedule: '* * * * *',
  })
  sayHelloEveryTime() {
    console.log('Hello again');
  }
}
