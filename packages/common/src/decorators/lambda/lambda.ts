import 'reflect-metadata';
import type { ServicesValues } from '../../types/services';

export interface LambdaProps {
  /**
   * Lambda execution time in seconds
   */
  timeout?: number;
  /**
   * The amount of memory, in MB, that is allocated to your lambda function.
   */
  memory?: number;
  /**
   * version of node environment
   */
  runtime?: 22 | 20 | 18;
  /**
   * services used by lambda function
   */
  services?: ServicesValues[];
  /**
   * variables extract from .env file or new variables from an object
   *
   * @example ['DB_HOST', { name: "other" }]
   */
  env?: (string | Record<string, string | number | boolean>)[];
  /**
   * tags of lambda
   */
  tags?: string[];
  /**
   * enables xray trace
   */
  enableTrace?: boolean;
}

export interface LambdaMetadata {
  name: string;
  lambda?: LambdaProps;
}

export enum LambdaReflectKeys {
  HANDLERS = 'lambda:handlers',
  ARGUMENTS = 'lambda:arguments',
  EVENT_PARAM = 'lambda:event_params',
}

export enum LambdaArgumentTypes {
  EVENT = 0,
  CALLBACK = 1,
  CONTEXT = 2,
}

export type CallbackParam = (error: boolean | null, response?: any) => void;

type LambdaArguments = Record<string, LambdaArgumentTypes[]>;
type LambdaArgumentsType = Record<
  LambdaArgumentTypes,
  ({
    event,
    context,
    callback,
  }: {
    event: any;
    context: any;
    callback: CallbackParam;
    argumentParser?: Partial<LambdaArgumentsType>;
  }) => any
>;

interface CreateLambdaDecoratorProps<T, M> {
  getLambdaMetadata: (params: T, methodName: string) => M;
  argumentParser?: Partial<LambdaArgumentsType>;
}

const argumentsByType: LambdaArgumentsType = {
  [LambdaArgumentTypes.EVENT]: ({ event, context, callback, argumentParser = {} }) =>
    argumentParser[LambdaArgumentTypes.EVENT]
      ? argumentParser[LambdaArgumentTypes.EVENT]({ event, context, callback })
      : event,
  [LambdaArgumentTypes.CALLBACK]: ({ event, context, callback, argumentParser = {} }) =>
    argumentParser[LambdaArgumentTypes.CALLBACK]
      ? argumentParser[LambdaArgumentTypes.CALLBACK]({ event, context, callback })
      : callback,
  [LambdaArgumentTypes.CONTEXT]: ({ event, context, callback, argumentParser = {} }) =>
    argumentParser[LambdaArgumentTypes.EVENT]
      ? argumentParser[LambdaArgumentTypes.EVENT]({ event, context, callback })
      : context,
};

const reflectArgumentMethod = (
  target: Function,
  methodName: string,
  type: LambdaArgumentTypes
) => {
  const properties: LambdaArguments =
    Reflect.getMetadata(LambdaReflectKeys.ARGUMENTS, target) || {};

  properties[methodName] = [...(properties[methodName] || []), type];
  Reflect.defineMetadata(LambdaReflectKeys.ARGUMENTS, properties, target);
};

export const createLambdaDecorator =
  <T, M>({ getLambdaMetadata, argumentParser }: CreateLambdaDecoratorProps<T, M>) =>
  (props?: T) =>
  (target: any, methodName: string, descriptor: PropertyDescriptor) => {
    const handlersMetadata: M[] =
      Reflect.getMetadata(LambdaReflectKeys.HANDLERS, target) || [];

    Reflect.defineMetadata(
      LambdaReflectKeys.HANDLERS,
      [...handlersMetadata, getLambdaMetadata(props || ({} as T), methodName)],
      target
    );

    const lambdaArguments: LambdaArguments = Reflect.getMetadata(
      LambdaReflectKeys.ARGUMENTS,
      target
    );

    const { value: originalValue } = descriptor;

    descriptor.value = async (event: any, context: any, callback: CallbackParam) => {
      const methodArguments = (lambdaArguments?.[methodName] || []).map((argumentType) =>
        argumentsByType[argumentType]({ event, context, callback, argumentParser })
      );

      const response = await originalValue.apply(this, methodArguments);

      return response;
    };
  };

export const createEventDecorator =
  <E extends { new (...args: any[]): {} }, T>(getEventFields: (FieldClass: E) => T) =>
  (FieldClass: E) =>
  (target: any, methodName: string, _number: number) => {
    const eventFields = getEventFields(FieldClass);

    const argumentsByMethod =
      Reflect.getMetadata(LambdaReflectKeys.EVENT_PARAM, target) || {};
    Reflect.defineMetadata(
      LambdaReflectKeys.EVENT_PARAM,
      {
        ...argumentsByMethod,
        ...(eventFields ? { [methodName]: eventFields } : {}),
      },
      target
    );
    reflectArgumentMethod(target, methodName, LambdaArgumentTypes.EVENT);
  };

export const Callback = () => (target: any, methodName: string, _number: number) => {
  reflectArgumentMethod(target, methodName, LambdaArgumentTypes.CALLBACK);
};

export const Context = () => (target: any, methodName: string, _number: number) => {
  reflectArgumentMethod(target, methodName, LambdaArgumentTypes.CONTEXT);
};
