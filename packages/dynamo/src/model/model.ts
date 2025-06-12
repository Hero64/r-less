import {
  type FieldsMetadata,
  ModelMetadataKeys,
  type DynamoModelProps,
} from './model.types';

export const DynamoModel =
  <T extends Function>(props: DynamoModelProps<T>) =>
  (constructor: T) => {
    const { name = constructor.name, indexes = [] } = props;

    Reflect.defineMetadata(
      ModelMetadataKeys.MODEL,
      {
        name,
        indexes,
      },
      constructor
    );
  };

export const Field = (constructor: any, name: string) => {
  const fields: FieldsMetadata[] =
    Reflect.getMetadata(ModelMetadataKeys.FIELDS, constructor) || {};
  const type = Reflect.getMetadata('design:type', constructor, name).name;

  Reflect.defineMetadata(
    ModelMetadataKeys.FIELDS,
    {
      ...fields,
      [name]: {
        name,
        type,
      },
    },
    constructor
  );
};

export const PartitionKey = (constructor: any, name: string) => {
  Field(constructor, name);
  Reflect.defineMetadata(ModelMetadataKeys.PARTITION_KEY, name, constructor);
};

export const SortKey = (constructor: any, name: string) => {
  Field(constructor, name);
  Reflect.defineMetadata(ModelMetadataKeys.SORT_KEY, name, constructor);
};
