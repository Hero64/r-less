import { Event, EventCron, EventRule } from '@really-less/event';

@Event()
export class GreetingEvent {
  @EventRule({
    rule: 'say-hello',
  })
  sayHello() {
    console.log('Hello');
  }

  @EventCron({
    schedule: {
      day: '*',
      hour: 1,
      minute: 1,
    },
  })
  sayHelloEveryTime() {
    console.log('Hello again');
  }
}
