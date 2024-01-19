import { createEventDecorator } from '@really-less/common';
import { StepFunctionReflectKeys } from '../step_function/step_function';

type ParamContextBase<C, T> = {
  /**
   * Identifies the context where the source is obtain
   */
  context: C;
  /**
   * Value or context parameter
   */
  source: T;
};

export type InputParamContext<T = any> = {
  /**
   * Identifies the context where the source is obtain
   */
  context: 'input';
  /**
   * Value or context parameter
   */
  source?: T extends {} ? keyof T : string;
};
export type ExecutionParamContext = ParamContextBase<
  'execution',
  'id' | 'input' | 'name' | 'role_arn' | 'start_time' | 'redrive_count' | 'redrive_time'
>;
export type StateParamContext = ParamContextBase<
  'state',
  'entered_time' | 'name' | 'retry_count'
>;
export type StateMachineParamContext = ParamContextBase<'state_machine', 'id' | 'name'>;
export type TaskParamContext = ParamContextBase<'state_machine', 'token'>;
export type PayloadParamContext<T = string> = ParamContextBase<'payload', T>;
export type MapParamContext = ParamContextBase<'map', 'index' | 'value'>;
export type CustomParamContext = {
  context: 'custom';
  /**
   * A simple value
   */
  value: any;
};

export type ParamContext<I> =
  | ExecutionParamContext
  | InputParamContext<I>
  | StateParamContext
  | StateMachineParamContext
  | TaskParamContext
  | PayloadParamContext
  | MapParamContext
  | CustomParamContext;

export type ParamProps<T> = {
  /**
   * Name of property
   *
   * @default class property name
   */
  name?: string;
} & ParamContext<T>;

export type ParamMetadata<T = any> = {
  name: string;
  type: string;
} & ParamProps<T>;

export const Event = createEventDecorator((ParamClass) => {
  return Reflect.getMetadata(StepFunctionReflectKeys.FIELD, ParamClass.prototype);
});

export const Param =
  <T = any>(props: ParamProps<T>) =>
  (target: any, key: string) => {
    const metadata: ParamMetadata<T>[] =
      Reflect.getMetadata(StepFunctionReflectKeys.FIELD, target) || [];

    const { name } = props;
    const type = Reflect.getMetadata('design:type', target, key).name;

    metadata.push({
      ...props,
      type,
      name: name ?? key,
    });
    Reflect.defineMetadata(StepFunctionReflectKeys.FIELD, metadata, target);
  };
