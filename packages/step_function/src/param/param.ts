import { createEventDecorator } from '@really-less/common';

import { StepFunctionReflectKeys } from '../step-function/step-function.types';
import { ParamMetadata, ParamProps } from './param.types';

export const Event = createEventDecorator((ParamClass) => {
  return Reflect.getMetadata(StepFunctionReflectKeys.FIELD, ParamClass.prototype);
});

export const Param =
  <T = any>(props: ParamProps<T>) =>
  (target: any, key: string) => {
    const metadata: ParamMetadata<T>[] =
      Reflect.getMetadata(StepFunctionReflectKeys.FIELD, target) || [];

    const { name } = props;
    const type = Reflect.getMetadata('design:type', target, key).name;

    metadata.push({
      ...props,
      type,
      name: name ?? key,
    });
    Reflect.defineMetadata(StepFunctionReflectKeys.FIELD, metadata, target);
  };
