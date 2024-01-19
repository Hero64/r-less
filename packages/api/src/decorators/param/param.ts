import 'reflect-metadata';
import { createEventDecorator } from '@really-less/common';

import { ApiReflectKeys } from '../api/api';

export type Source = 'body' | 'path' | 'query' | 'header';

export interface ParamProps {
  /**
   * original name of param
   *
   * @default string name of field class property
   */
  name?: string;
  /**
   * specify field is required
   * @default true
   */
  required?: boolean;
  /**
   * source to obtain field value
   * @default path
   */
  source?: Source;
}

export interface ParamMetadata extends Required<ParamProps> {
  destinationField: string;
  type: string;
}
export const Event = createEventDecorator((ParamClass) => {
  return Reflect.getMetadata(ApiReflectKeys.FIELD, ParamClass.prototype);
});

export const Param =
  (props: ParamProps = {}) =>
  (target: any, propertyKey: string) => {
    const { source = 'query', required = true, name } = props;
    const paramMetadata: ParamMetadata[] =
      Reflect.getMetadata(ApiReflectKeys.FIELD, target) || [];

    const type = Reflect.getMetadata('design:type', target, propertyKey).name;

    paramMetadata.push({
      type,
      source,
      required,
      name: name ?? propertyKey,
      destinationField: propertyKey,
    });
    Reflect.defineMetadata(ApiReflectKeys.FIELD, paramMetadata, target);
  };
