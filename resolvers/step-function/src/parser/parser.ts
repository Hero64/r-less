import 'reflect-metadata';

import { CommonResolverProps } from '@really-less/common-resolver';
import { StepFunctionMapResourceMetadata } from '@really-less/step_function';
import { StepFunctionResolver } from './step-function/step-function';
import { ResourceReflectKeys } from '@really-less/common';

export const parser = async (props: CommonResolverProps) => {
  const { stackResource } = props;

  const stepFunctionMetadata: StepFunctionMapResourceMetadata = Reflect.getMetadata(
    ResourceReflectKeys.RESOURCE,
    stackResource
  );

  const stepFunctionResolver = new StepFunctionResolver({
    ...props,
    stepFunctionMetadata,
  });

  stepFunctionResolver.generate();
};
