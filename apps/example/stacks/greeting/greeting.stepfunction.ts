import { StepFunction, Task } from '@really-less/step_function';

@StepFunction({
  startAt: 'sayHello',
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
  sayHello() {
    return {
      isInTheMorning: true,
    };
  }

  @Task({
    end: true,
  })
  sayGoodMorning() {
    console.log('good morning');
  }

  @Task()
  sayGoodNight() {
    console.log('good bye');
  }
}
