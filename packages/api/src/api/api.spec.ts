import 'reflect-metadata';
import {
  ResourceReflectKeys,
  LambdaReflectKeys,
  REALLY_LESS_CONTEXT,
  REALLY_LESS_CONTEXT_VALUE,
} from '@really-less/common';

import { Api, Get, Post } from './api';
import { Param, Event } from '../param/param';
import type { ApiLambdaMetadata, ApiResourceMetadata } from './api.types';

process.env[REALLY_LESS_CONTEXT] = REALLY_LESS_CONTEXT_VALUE;

class ExampleArgument {
  @Param({
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
  let resource: ApiResourceMetadata;

  beforeAll(() => {
    resource = Reflect.getMetadata(ResourceReflectKeys.RESOURCE, ExampleApi);
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
