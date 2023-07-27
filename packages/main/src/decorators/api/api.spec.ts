import 'reflect-metadata';
import {
  Api,
  Get,
  Post,
  ApiField,
  ApiEvent,
  ApiResourceMetadata,
  ApiLambdaMetadata,
} from './api';
import { ResourceReflectKeys } from '../resource/resource';
import { LambdaReflectKeys } from '../lambda/lambda';
import {
  REALLY_LESS_CONTEXT,
  REALLY_LESS_CONTEXT_VALUE,
} from '../../constants/env.constants';

process.env[REALLY_LESS_CONTEXT] = REALLY_LESS_CONTEXT_VALUE;
class ExampleArgument {
  @ApiField({
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
  getLambdaWithEvent(@ApiEvent(ExampleArgument) e: ExampleArgument) {}
}

describe('API Decorator', () => {
  let resource: ApiResourceMetadata;

  beforeAll(() => {
    resource = Reflect.getMetadata(ResourceReflectKeys.RESOURCE, ExampleApi);
    console.log(ResourceReflectKeys.RESOURCE);
  });

  it('Should exist api resource', () => {
    expect(resource).toBeDefined();
  });

  it('Should get resource params', () => {
    expect(resource.name).toBe(ExampleApi.name);
  });
});

describe('METHOD decorator', () => {
  let handlers: ApiLambdaMetadata[];

  beforeAll(() => {
    handlers = Reflect.getMetadata(LambdaReflectKeys.HANDLERS, ExampleApi.prototype);
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
      LambdaReflectKeys.ARGUMENTS,
      ExampleApi.prototype
    );

    expect(handlerProperties).toBeDefined();
    expect(handlerProperties.getLambdaWithEvent).toBeDefined();
  });

  it('Should get argument class', () => {
    const argumentClass = Reflect.getMetadata(
      LambdaReflectKeys.ARGUMENTS,
      ExampleApi.prototype
    );

    expect(argumentClass).toBeDefined();
    expect(argumentClass.getLambdaWithEvent).toBeDefined();
  });
});
