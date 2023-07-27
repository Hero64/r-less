import 'reflect-metadata';
import {
  Api,
  Get,
  Post,
  ApiReflectKeys,
  ResourceMetadata,
  HandlerMetadata,
  Event,
} from './api.decorators';
import { Argument } from '../argument/argument.decorators';

class ExampleArgument {
  @Argument({
    required: true,
    source: 'path',
  })
  propertyOne: string;
}

@Api()
class ExampleApi {
  @Get()
  getLambda() {}

  @Post()
  postLambda() {}

  @Get()
  getLambdaWithEvent(@Event(ExampleArgument) e: ExampleArgument) {}
}

describe('API Decorator', () => {
  let resource: ResourceMetadata;

  beforeAll(() => {
    resource = Reflect.getMetadata(ApiReflectKeys.RESOURCE, ExampleApi);
  });

  it('Should exist api resource', () => {
    expect(resource).toBeDefined();
  });

  it('Should get resource params', () => {
    expect(resource.name).toBe(ExampleApi.name);
  });
});

describe('METHOD decorator', () => {
  let handlers: HandlerMetadata[];

  beforeAll(() => {
    handlers = Reflect.getMetadata(ApiReflectKeys.HANDLERS, ExampleApi.prototype);
  });

  it('Should exist api handlers', () => {
    expect(handlers).toBeDefined();
  });

  it('Should get handler for GET method', () => {
    const getHandler = handlers[0];

    expect(getHandler).toBeDefined();
    expect(getHandler.name).toBe('getLambda');
  });

  it('Should get handler for Post method', () => {
    const getHandler = handlers[1];

    expect(getHandler).toBeDefined();
    expect(getHandler.name).toBe('postLambda');
  });
});

describe('EVENT decorator', () => {
  it('Should exits event parameter', () => {
    const handlerProperties = Reflect.getMetadata(
      ApiReflectKeys.PROPERTIES,
      ExampleApi.prototype
    );

    expect(handlerProperties).toBeDefined();
    expect(handlerProperties.getLambdaWithEvent).toBeDefined();
  });

  it('Should get argument class', () => {
    const argumentClass = Reflect.getMetadata(
      ApiReflectKeys.ARGUMENTS,
      ExampleApi.prototype
    );

    expect(argumentClass).toBeDefined();
    expect(argumentClass.getLambdaWithEvent).toBeDefined();
  });
});
