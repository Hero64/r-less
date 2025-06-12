import { Event, StepFunction, Task, StateFunctionMap } from '@really-less/step_function';
import { GreetingSFParam } from './greeting.field';

@StateFunctionMap({
  startAt: 'iterate',
  mode: 'inline',
})
class MapIterator {
  @Task({
    next: {
      type: 'pass',
      end: true,
    },
  })
  iterate() {
    console.log('sss');
  }
}

@StepFunction({
  startAt: {
    type: 'wait',
    seconds: 2000,
    next: 'sayHello',
  },
})
export class GreetingStepFunction {
  @Task({
    next: {
      type: 'choice',
      choices: [
        {
          mode: 'booleanEquals',
          value: true,
          variable: 'isInTheMorning',
          next: 'sayGoodMorning',
        },
        {
          mode: 'booleanEquals',
          value: false,
          variable: 'isInTheMorning',
          next: 'sayGoodNight',
        },
      ],
    },
  })
  sayHello(@Event(GreetingSFParam) e: GreetingSFParam) {
    console.log(e);

    return {
      ...e,
      isInTheMorning: true,
    };
  }

  @Task({
    end: true,
  })
  sayGoodMorning() {
    console.log('good morning');
  }

  @Task({
    next: {
      type: 'map',
      itemsPath: 'values',
      itemProcessor: MapIterator,
    },
  })
  sayGoodNight() {
    console.log('good bye');

    return {
      values: [1, 2, 3, 4],
    };
  }
}
