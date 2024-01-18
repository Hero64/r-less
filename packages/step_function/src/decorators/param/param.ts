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

type ExecutionParamContext = ParamContextBase<
  'execution',
  'id' | 'input' | 'name' | 'role_arn' | 'start_time' | 'redrive_count' | 'redrive_time'
>;

type InputParamContext<T> = ParamContextBase<'input', T extends {} ? keyof T : string>;
type StateParamContext = ParamContextBase<
  'state',
  'entered_time' | 'name' | 'retry_count'
>;
type StateMachineParamContext = ParamContextBase<'state_machine', 'id' | 'name'>;
type TaskParamContext = ParamContextBase<'state_machine', 'token'>;
type DataParamContext = ParamContextBase<'data', string>;
type MapParamContext = ParamContextBase<'map', 'index' | 'value'>;
type CustomParamContext = {
  context: 'custom';
  /**
   * A simple value
   */
  value: any;
};

type ParamContext<I> =
  | ExecutionParamContext
  | InputParamContext<I>
  | StateParamContext
  | StateMachineParamContext
  | TaskParamContext
  | DataParamContext
  | MapParamContext
  | CustomParamContext;

type ParamProps<T> = {
  /**
   * Name of property
   *
   * @default class property name
   */
  name?: string;
} & ParamContext<T>;

interface Input {
  name: string;
}

const Parameter =
  <T = any>(props: ParamProps<T>) =>
  (target: any, key: string) => {
    const metadata: ParamProps<T>[] =
      Reflect.getMetadata(StepFunctionReflectKeys.FIELD, target) || [];

    const { name } = props;

    metadata.push({
      ...props,
      name: name ?? key,
    });
    Reflect.defineMetadata(StepFunctionReflectKeys.FIELD, metadata, target);
  };
