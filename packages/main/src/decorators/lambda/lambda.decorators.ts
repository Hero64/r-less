import 'reflect-metadata';

export interface LambdaProps {
  timeout?: number;
  memory?: number;
  runtime: 18 | 16;
}

export interface LambdaMetadata {
  name: string;
  lambda?: LambdaProps;
}

export enum LambdaReflectKeys {
  HANDLERS = 'lambda:handlers',
  ARGUMENTS = 'lambda:arguments',
  EVENT_ARGUMENTS = 'lambda:event_arguments',
}

export enum LambdaArgumentTypes {
  EVENT,
  CALLBACK,
}

type LambdaArguments = Record<string, LambdaArgumentTypes[]>;

const argumentsByType: Record<
  LambdaArgumentTypes,
  ({ event, callback }: { event: any; callback: any }) => any
> = {
  [LambdaArgumentTypes.EVENT]: ({ event }) => event,
  [LambdaArgumentTypes.CALLBACK]: ({ callback }) => callback,
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
  <T, M>(getLambdaMetadata: (params: T, methodName: string) => M) =>
  (props: T) =>
  (target: any, methodName: string, descriptor: PropertyDescriptor) => {
    const handlersMetadata: M[] =
      Reflect.getMetadata(LambdaReflectKeys.HANDLERS, target) || [];

    Reflect.defineMetadata(
      LambdaReflectKeys.HANDLERS,
      [
        ...handlersMetadata,
        {
          ...getLambdaMetadata(props, methodName),
        },
      ],
      target
    );

    const lambdaArguments: LambdaArguments = Reflect.getMetadata(
      LambdaReflectKeys.ARGUMENTS,
      target
    );

    const { value: originalValue } = descriptor;

    descriptor.value = async (event: any, _context: any, callback: any) => {
      try {
        const methodArguments = lambdaArguments[methodName].map((argumentType) =>
          argumentsByType[argumentType]({ event, callback })
        );
        await originalValue.apply(this, methodArguments);
      } catch (e) {
        if (e instanceof Error) {
          callback(e.message);
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
      Reflect.getMetadata(LambdaReflectKeys.ARGUMENTS, target) || {};
    Reflect.defineMetadata(
      LambdaReflectKeys.ARGUMENTS,
      {
        ...argumentsByMethod,
        ...(eventFields ? { [methodName]: eventFields } : {}),
      },
      target
    );
    reflectArgumentMethod(target, methodName, LambdaArgumentTypes.EVENT);
  };

export const Callback =
  <E extends { new (...args: any[]): {} }>(_Attributes: E) =>
  (target: any, methodName: string, _number: number) => {
    reflectArgumentMethod(target, methodName, LambdaArgumentTypes.CALLBACK);
  };
