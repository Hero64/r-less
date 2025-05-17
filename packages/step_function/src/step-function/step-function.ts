import 'reflect-metadata';
import {
  createResourceDecorator,
  createLambdaDecorator,
  LambdaArgumentTypes,
} from '@really-less/common';

import {
  DefaultMethod,
  LambdaTaskMetadata,
  LambdaTaskProps,
  StepFunctionMapProps,
  StepFunctionMapResourceProps,
  StepFunctionReflectKeys,
  StepFunctionResourceProps,
} from './step-function.types';

export const RESOURCE_TYPE = 'STEP_FUNCTION';

export const StateFunctionMap =
  <T extends Function>(props: StepFunctionMapProps<keyof T['prototype']>) =>
  (constructor: T) => {
    return createResourceDecorator<StepFunctionMapResourceProps<keyof T['prototype']>>({
      type: StepFunctionReflectKeys.MAP,
      callerFileIndex: 6,
    })(props)(constructor);
  };

export const StepFunction =
  <T extends Function>(props: StepFunctionResourceProps<keyof T['prototype']>) =>
  (constructor: T) =>
    createResourceDecorator<StepFunctionResourceProps<keyof T['prototype']>>({
      type: RESOURCE_TYPE,
      callerFileIndex: 6,
    })(props)(constructor);

export const Task =
  <T extends Record<K, DefaultMethod>, K extends keyof T>(
    props?: LambdaTaskProps<T, T[K]>
  ) =>
  (target: T, methodName: K, descriptor: PropertyDescriptor) => {
    return createLambdaDecorator<LambdaTaskProps<T, T[K]>, LambdaTaskMetadata<T, T[K]>>({
      getLambdaMetadata: (props) => ({
        ...props,
        name: methodName as string,
      }),
      argumentParser: {
        [LambdaArgumentTypes.EVENT]: ({ event }) => event.Payload,
      },
    })(props)(target, methodName as string, descriptor);
  };
