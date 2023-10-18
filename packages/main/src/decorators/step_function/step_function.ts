import { LambdaMetadata, LambdaProps, createLambdaDecorator } from '../lambda/lambda';
import {
  ResourceType,
  ResourceProps,
  createResourceDecorator,
  ResourceMetadata,
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

interface ValidateByType<T, V = never> {
  mode: T;
  value: V;
  variable: string;
}

type ValidateBoolean = ValidateByType<'booleanEquals', boolean>;
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
  | 'isNull'
>;

export type ValidateValues =
  | ValidateBoolean
  | ValidateString
  | ValidateNumber
  | ValidateIs;

export interface ValidateNot {
  mode: 'not';
  condition: ValidateValues;
}

export type ValidateMultipleTypes = 'and' | 'or';

export interface ValidateMultiple {
  mode: ValidateMultipleTypes;
  conditions: Validations[];
}

export type Validations = ValidateValues | ValidateMultiple | ValidateNot;

type ChoiceCondition<M> = Validations & {
  next: TaskTypes<M>;
};

export interface ChoiceTask<M> {
  type: 'choice';
  choices: ChoiceCondition<M>[];
  default?: TaskTypes<M>;
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

export type TaskTypes<M> =
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

export interface LambdaTaskMetadata<T = {}> extends TaskProps<keyof T>, LambdaMetadata {}

interface LambdaTaskProps<T = {}> extends TaskProps<keyof T>, Partial<LambdaProps> {}

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
  <T>(props?: LambdaTaskProps<T>) =>
  (target: T, methodName: string, descriptor: PropertyDescriptor) =>
    createLambdaDecorator<LambdaTaskProps<T>, LambdaTaskMetadata<T>>((props) => ({
      ...props,
      name: methodName,
    }))(props)(target, methodName, descriptor);
