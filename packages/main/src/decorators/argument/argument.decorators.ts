import 'reflect-metadata';

export enum ArgumentReflectKeys {
  PROPERTIES = 'arguments:properties',
}

export type Source = 'body' | 'path' | 'query' | 'header';

export interface ArgumentProps {
  field?: string;
  required?: boolean;
  source?: Source;
}

export interface MetadataArguments extends Required<ArgumentProps> {
  destinationField: string;
  type: string;
}

export const Argument =
  (props: ArgumentProps = {}) =>
  (target: any, propertyKey: string) => {
    const { source = 'body', required = true, field } = props;
    const properties: MetadataArguments[] =
      Reflect.getMetadata(ArgumentReflectKeys.PROPERTIES, target) || [];

    const type = Reflect.getMetadata('design:type', target, propertyKey).name;

    properties.push({
      type,
      source,
      required,
      field: field ?? propertyKey,
      destinationField: propertyKey,
    });
    Reflect.defineMetadata(ArgumentReflectKeys.PROPERTIES, properties, target);
  };
