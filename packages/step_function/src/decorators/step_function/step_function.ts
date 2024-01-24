import 'reflect-metadata';
import {
  ResourceType,
  ResourceProps,
  createResourceDecorator,
  ResourceMetadata,
  LambdaMetadata,
  LambdaProps,
  createLambdaDecorator,
  LambdaArgumentTypes,
} from '@really-less/common';
import {
  ExecutionParamContext,
  InputParamContext,
  StateParamContext,
  StateMachineParamContext,
  TaskParamContext,
  CustomParamContext,
} from '../param/param';

type DefaultMethod = (...args: any) => any;
type ReturnMethodKeyOfOrString<T extends DefaultMethod> = ReturnType<T> extends {}
  ? keyof ReturnType<T>
  : string;

export enum StepFunctionReflectKeys {
  FIELD = 'step_function:field',
  MAP = 'step_function:map',
}

interface StepFunctionProps<T> {
  startAt: InitialTaskType<T>;
}

export type ProcessorMode = 'inline' | 'distributed';
export type ProcessorExecutionType = 'standard' | 'express';

export interface StepFunctionMapProps<T> extends StepFunctionProps<T> {
  executionType?: ProcessorExecutionType;
  mode?: ProcessorMode;
}

interface WaitTask<M> {
  type: 'wait';
  seconds: number;
  next: TaskTypes<M>;
}

export type ParameterItem<R extends DefaultMethod = any> =
  | ReturnMethodKeyOfOrString<R>
  | ExecutionParamContext
  | InputParamContext
  | StateParamContext
  | StateMachineParamContext
  | TaskParamContext
  | CustomParamContext;

interface ValidateByType<T, V, R extends DefaultMethod = any> {
  mode: T;
  value: V;
  variable: ParameterItem<R>;
}

type ValidateBoolean<R extends DefaultMethod> = ValidateByType<
  'booleanEquals',
  boolean,
  R
>;
type ValidateString = ValidateByType<
  | 'booleanEqualsJsonPath'
  | 'stringEqualsJsonPath'
  | 'stringEquals'
  | 'stringLessThan'
  | 'stringLessThanJsonPath'
  | 'stringLessThanEquals'
  | 'stringLessThanEqualsJsonPath'
  | 'stringGreaterThan'
  | 'stringGreaterThanJsonPath'
  | 'stringGreaterThanEqualsJsonPath'
  | 'stringGreaterThanEquals'
  | 'numberEqualsJsonPath'
  | 'numberLessThanJsonPath'
  | 'numberLessThanEqualsJsonPath'
  | 'numberGreaterThanJsonPath'
  | 'numberGreaterThanEqualsJsonPath'
  | 'timestampEquals'
  | 'timestampEqualsJsonPath'
  | 'timestampLessThan'
  | 'timestampLessThanJsonPath'
  | 'timestampLessThanEquals'
  | 'timestampLessThanEqualsJsonPath'
  | 'timestampGreaterThan'
  | 'timestampGreaterThanJsonPath'
  | 'timestampGreaterThanEquals'
  | 'timestampGreaterThanEqualsJsonPath'
  | 'stringMatches',
  string
>;

type ValidateNumber = ValidateByType<
  | 'numberEquals'
  | 'numberLessThan'
  | 'numberLessThanEquals'
  | 'numberGreaterThan'
  | 'numberGreaterThanEquals',
  number
>;

type ValidateIs = ValidateByType<
  | 'isPresent'
  | 'isNotPresent'
  | 'isString'
  | 'isNotString'
  | 'isNumeric'
  | 'isNotNumeric'
  | 'isBoolean'
  | 'isNotBoolean'
  | 'isTimestamp'
  | 'isNotTimestamp'
  | 'isNotNull'
  | 'isNull',
  never
>;

export type ValidateValues<R extends DefaultMethod = any> =
  | ValidateBoolean<R>
  | ValidateString
  | ValidateNumber
  | ValidateIs;

export interface ValidateNot<R extends DefaultMethod> {
  mode: 'not';
  condition: ValidateValues<R>;
}

export type ValidateMultipleTypes = 'and' | 'or';

export interface ValidateMultiple<R extends DefaultMethod> {
  mode: ValidateMultipleTypes;
  conditions: Validations<R>[];
}

export type Validations<R extends DefaultMethod = any> =
  | ValidateValues<R>
  | ValidateMultiple<R>
  | ValidateNot<R>;

type ChoiceCondition<M, R extends DefaultMethod> = Validations<R> & {
  next: TaskTypes<M, R>;
};

export interface ChoiceTask<M, R extends DefaultMethod> {
  type: 'choice';
  choices: ChoiceCondition<M, R>[];
  default?: TaskTypes<M, R>;
}

interface ParallelTask<M> {
  type: 'parallel';
  branches: TaskTypes<M>[];
  end?: boolean;
  next?: TaskTypes<M>;
}

interface FailTask {
  type: 'fail';
  cause: string;
  error: string;
}

interface SucceedTask {
  type: 'succeed';
}

interface PassTask<M> {
  type: 'pass';
  next?: M;
  end?: boolean;
}

interface MapTask<M, R extends DefaultMethod = any> {
  type: 'map';
  itemsPath: ParameterItem<R> | '$';
  next?: TaskTypes<M>;
  maxCurrency?: number;
  itemProcessor: { new (...any: []): {} };
}

interface TaskRetry {
  errorEquals: string[];
  intervalSeconds?: number;
  maxAttempt?: number;
  backoffRate?: number;
}

interface TaskCatch<M> {
  errorEquals: string[];
  next?: M | PassTask<M> | SucceedTask | FailTask;
}

export type InitialTaskType<M, R extends DefaultMethod = any> =
  | M
  | WaitTask<M>
  | ChoiceTask<M, R>
  | ParallelTask<M>;

export type TaskTypes<M, R extends DefaultMethod = any> =
  | PassTask<M>
  | FailTask
  | SucceedTask
  | MapTask<M, R>
  | InitialTaskType<M, R>;

interface TaskProps<M, R extends DefaultMethod> {
  retry?: TaskRetry;
  catch?: TaskCatch<M>;
  end?: boolean;
  next?: TaskTypes<M, R>;
}

export interface LambdaTaskMetadata<T = {}, R extends DefaultMethod = any>
  extends TaskProps<keyof T, R>,
    LambdaMetadata {}

interface LambdaTaskProps<T = {}, R extends DefaultMethod = any>
  extends TaskProps<keyof T, R>,
    Partial<LambdaProps> {}

export interface StepFunctionResourceProps<T>
  extends ResourceProps,
    StepFunctionProps<T> {}

export interface StepFunctionMapResourceProps<T>
  extends ResourceProps,
    StepFunctionMapProps<T> {}

export interface StepFunctionResourceMetadata extends ResourceMetadata {
  startAt: InitialTaskType<string>;
}

export interface StepFunctionMapResourceMetadata
  extends ResourceMetadata,
    StepFunctionMapProps<any> {}

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
      type: ResourceType.STEP_FUNCTION,
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
