import type {
  LambdaMetadata,
  LambdaProps,
  ResourceMetadata,
  ResourceProps,
} from '@really-less/common';

import type {
  CustomParamContext,
  ExecutionParamContext,
  InputParamContext,
  PayloadParamContext,
  StateMachineParamContext,
  StateParamContext,
  TaskParamContext,
} from '../param';

export type DefaultMethod = (...args: any) => any;
export type ReturnMethodKeyOfOrString<T extends DefaultMethod> = ReturnType<T> extends {}
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

interface ValidateByTypeWithoutValue<T, R extends DefaultMethod = any> {
  mode: T;
  variable: ParameterItem<R>;
}

export interface ValidateByType<T, V, R extends DefaultMethod = any>
  extends ValidateByTypeWithoutValue<T, R> {
  value: V;
}

export type ValidateBoolean<R extends DefaultMethod> = ValidateByType<
  'booleanEquals',
  boolean,
  R
>;

export type ValidateString<R extends DefaultMethod> = ValidateByType<
  | 'booleanEquals'
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
  string,
  R
>;

export type ValidateNumber<R extends DefaultMethod> = ValidateByType<
  | 'numberEquals'
  | 'numberLessThan'
  | 'numberLessThanEquals'
  | 'numberGreaterThan'
  | 'numberGreaterThanEquals',
  number,
  R
>;

export type ValidateIs<R extends DefaultMethod> = ValidateByTypeWithoutValue<
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
  R
>;

export type ValidateValues<R extends DefaultMethod = any> =
  | ValidateString<R>
  | ValidateNumber<R>
  | ValidateIs<R>
  | ValidateBoolean<R>;

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
  itemsPath: ReturnMethodKeyOfOrString<R> | InputParamContext | PayloadParamContext | '$';
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
  | ParallelTask<M>
  | MapTask<M, R>;

export type TaskTypes<M, R extends DefaultMethod = any> =
  | PassTask<M>
  | FailTask
  | SucceedTask
  | InitialTaskType<M, R>;

export interface TaskProps<M, R extends DefaultMethod> {
  retry?: TaskRetry;
  catch?: TaskCatch<M>;
  end?: boolean;
  next?: TaskTypes<M, R>;
}

export interface LambdaTaskMetadata<T = {}, R extends DefaultMethod = any>
  extends TaskProps<keyof T, R>,
    LambdaMetadata {}

export interface LambdaTaskProps<T = {}, R extends DefaultMethod = any>
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
