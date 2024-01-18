import {
  ResourceType,
  ResourceProps,
  createResourceDecorator,
  ResourceMetadata,
  LambdaMetadata,
  LambdaProps,
  createLambdaDecorator,
} from '@really-less/common';
import 'reflect-metadata';

type DefaultMethod = (...args: any) => any;

interface StepFunctionProps<T extends Function, R extends DefaultMethod = any> {
  startAt: InitType<keyof T['prototype'], R>;
}

interface WaitTask<M> {
  type: 'wait';
  seconds: number;
  next: TaskTypes<M>;
}

interface ValidateByType<T, V, R extends DefaultMethod = any> {
  mode: T;
  value: V;
  variable: ReturnType<R> extends {} ? keyof ReturnType<R> : string;
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

interface MapTask<M> {
  type: 'map';
  itemsPath: string;
  params: Record<string, string>;
  iterator: TaskTypes<M>;
  next?: TaskTypes<M>;
  maxCurrency?: number;
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

export type InitType<M, R extends DefaultMethod = any> =
  | M
  | WaitTask<M>
  | ChoiceTask<M, R>
  | ParallelTask<M>
  | MapTask<M>;

export type TaskTypes<M, R extends DefaultMethod = any> =
  | PassTask<M>
  | FailTask
  | SucceedTask
  | InitType<M, R>;

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

export interface StepFunctionResourceProps<T extends Function>
  extends ResourceProps,
    StepFunctionProps<T> {}

export interface StepFunctionResourceMetadata extends ResourceMetadata {
  startAt: string;
}

export const StepFunction =
  <T extends Function>(props: StepFunctionResourceProps<T>) =>
  (constructor: T) =>
    createResourceDecorator<StepFunctionResourceProps<T>>({
      type: ResourceType.STEP_FUNCTION,
      callerFileIndex: 6,
    })(props)(constructor);

export const Task =
  <T extends Record<K, DefaultMethod>, K extends keyof T>(
    props?: LambdaTaskProps<T, T[K]>
  ) =>
  (target: T, methodName: K, descriptor: PropertyDescriptor) => {
    return createLambdaDecorator<LambdaTaskProps<T, T[K]>, LambdaTaskMetadata<T, T[K]>>(
      (props) => ({
        ...props,
        name: methodName as string,
      })
    )(props)(target, methodName as string, descriptor);
  };
