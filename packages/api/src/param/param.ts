import 'reflect-metadata';
import { createEventDecorator } from '@really-less/common';

import { ApiReflectKeys } from '../api/api.types';
import type { ParamMetadata, ParamProps } from './param.types';

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
