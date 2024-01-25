import 'reflect-metadata';
import { ServicesValues } from '../../types/services';

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
  runtime?: 20 | 18 | 16;
  /**
   * services used by lambda function
   */
  services?: ServicesValues[];
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
  EVENT,
  CALLBACK,
}

type LambdaArguments = Record<string, LambdaArgumentTypes[]>;
type LambdaArgumentsType = Record<
  LambdaArgumentTypes,
  ({
    event,
    callback,
  }: {
    event: any;
    callback: any;
    argumentParser?: Partial<LambdaArgumentsType>;
  }) => any
>;

type ResponseParser = (
  callback: (error: any, response: any) => void,
  response: any,
  isError?: boolean
) => any;

interface CreateLambdaDecoratorProps<T, M> {
  getLambdaMetadata: (params: T, methodName: string) => M;
  responseParser?: ResponseParser;
  argumentParser?: Partial<LambdaArgumentsType>;
}

const argumentsByType: LambdaArgumentsType = {
  [LambdaArgumentTypes.EVENT]: ({ event, callback, argumentParser = {} }) =>
    argumentParser[LambdaArgumentTypes.EVENT]
      ? argumentParser[LambdaArgumentTypes.EVENT]({ event, callback })
      : event,
  [LambdaArgumentTypes.CALLBACK]: ({ event, callback, argumentParser = {} }) =>
    argumentParser[LambdaArgumentTypes.CALLBACK]
      ? argumentParser[LambdaArgumentTypes.CALLBACK]({ event, callback })
      : callback,
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

const responseLambda = (
  response: any,
  callback?: any,
  parser?: ResponseParser,
  isError: boolean = false
) => {
  if (parser && callback) {
    parser(callback, response, isError);
    return;
  }

  if (callback) {
    isError ? callback(response) : callback(null, response);
  } else {
    return response;
  }
};

export const createLambdaDecorator =
  <T, M>({
    getLambdaMetadata,
    responseParser,
    argumentParser,
  }: CreateLambdaDecoratorProps<T, M>) =>
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

    descriptor.value = async (event: any, _context: any, callback: any) => {
      try {
        const methodArguments = (lambdaArguments?.[methodName] || []).map(
          (argumentType) =>
            argumentsByType[argumentType]({ event, callback, argumentParser })
        );
        const response = await originalValue.apply(this, methodArguments);
        return responseLambda(response, callback, responseParser);
      } catch (e) {
        if (e instanceof Error) {
          return responseLambda(e.message, callback, responseParser, true);
        }
      }
    };
  };

export const createEventDecorator =
  <E extends { new (...args: any[]): {} }, T>(getEventFields: (FieldClass: E) => T) =>
  (FieldClass: E) =>
  (target: any, methodName: string, _number: number) => {
    const eventFields = getEventFields(FieldClass);

    let argumentsByMethod =
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
