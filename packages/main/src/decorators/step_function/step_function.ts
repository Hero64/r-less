import { LambdaMetadata, createLambdaDecorator } from '../lambda/lambda';
import {
  ResourceType,
  ResourceProps,
  createResourceDecorator,
} from '../resource/resource';
import 'reflect-metadata';

interface StepFunctionProps<T extends Function> {
  startAt: keyof T['prototype'];
}

interface WaitTask<M> {
  type: 'wait';
  seconds: number;
  next: TaskTypes<M>;
}

interface Validate {
  mode:
    | 'BooleanEquals'
    | 'BooleanEqualsPath'
    | 'IsBoolean'
    | 'IsNull'
    | 'IsNumeric'
    | 'IsPresent'
    | 'IsString'
    | 'IsTimestamp'
    | 'NumericEquals'
    | 'NumericEqualsPath'
    | 'NumericGreaterThan'
    | 'NumericGreaterThanPath'
    | 'NumericGreaterThanEquals'
    | 'NumericGreaterThanEqualsPath'
    | 'NumericLessThan'
    | 'NumericLessThanPath'
    | 'NumericLessThanEquals'
    | 'NumericLessThanEqualsPath'
    | 'StringEquals'
    | 'StringEqualsPath'
    | 'StringGreaterThan'
    | 'StringGreaterThanPath'
    | 'StringGreaterThanEquals'
    | 'StringGreaterThanEqualsPath'
    | 'StringLessThan'
    | 'StringLessThanPath'
    | 'StringLessThanEquals'
    | 'StringLessThanEqualsPath'
    | 'StringMatches'
    | 'TimestampEquals'
    | 'TimestampEqualsPath'
    | 'TimestampGreaterThan'
    | 'TimestampGreaterThanPath'
    | 'TimestampGreaterThanEquals'
    | 'TimestampGreaterThanEqualsPath'
    | 'TimestampLessThan'
    | 'TimestampLessThanPath'
    | 'TimestampLessThanEquals'
    | 'TimestampLessThanEqualsPath';
  variable: string;
}

interface ValidateNot {
  mode: 'Not';
  condition: Validate;
}

interface ValidateMultiple {
  mode: 'And' | 'Or';
  conditions: Validate[] | ValidateNot[] | ValidateMultiple[];
}

interface ChoiceCondition<M> {
  validate: Validate | ValidateMultiple;
  next: TaskTypes<M>;
}

interface ChoiceTask<M> {
  type: 'choice';
  choices: ChoiceCondition<M>[];
  default?: TaskTypes<M>;
}

interface ParallelBranches<M> {
  task: M;
}

interface ParallelTask<M> {
  type: 'parallel';
  branches: ParallelBranches<M>[];
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

interface MapIterator<M> {
  task: M;
}

interface MapTask<M> {
  type: 'map';
  itemsPath: string;
  params: Record<string, string>;
  iterator: MapIterator<M>;
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

type TaskTypes<M> =
  | M
  | WaitTask<M>
  | ChoiceTask<M>
  | ParallelTask<M>
  | PassTask<M>
  | MapTask<M>
  | FailTask
  | SucceedTask;

interface TaskProps<M> {
  retry?: TaskRetry;
  catch?: TaskCatch<M>;
  end?: boolean;
  next?: TaskTypes<M>;
}

interface LambdaTaskMetadata<T> extends TaskProps<keyof T>, LambdaMetadata {}
interface StepFunctionResourceProps<T extends Function>
  extends ResourceProps,
    StepFunctionProps<T> {}

export const StepFunction =
  <T extends Function>(props: StepFunctionResourceProps<T>) =>
  (constructor: T) =>
    createResourceDecorator<StepFunctionResourceProps<T>>(
      ResourceType.STEP_FUNCTION,
      (props) => props
    )(props)(constructor);

export const Task =
  <T>(props: LambdaTaskMetadata<T>) =>
  (target: T, methodName: string, descriptor: PropertyDescriptor) =>
    createLambdaDecorator<LambdaTaskMetadata<T>, LambdaTaskMetadata<T>>((props) => ({
      ...props,
      name: methodName,
    }))(props)(target, methodName, descriptor);
