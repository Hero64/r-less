import 'reflect-metadata';
import { Argument, ArgumentReflectKeys, MetadataArguments } from './argument.decorators';

class ExampleArgument {
  @Argument({
    required: false,
    source: 'header',
  })
  propertyOne: string;

  @Argument({
    field: 'propertyRename',
    required: false,
    source: 'query',
  })
  propertyTwo: string;
}

describe('API Decorator', () => {
  let properties: MetadataArguments[];
  beforeAll(() => {
    properties = Reflect.getMetadata(
      ArgumentReflectKeys.PROPERTIES,
      ExampleArgument.prototype
    );
  });

  it('Should exist metadata', () => {
    expect(properties).toBeDefined();
  });

  it('Should create 2 argument definition', () => {
    expect(properties.length).toEqual(2);
  });
});
