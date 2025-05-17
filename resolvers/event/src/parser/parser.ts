import 'reflect-metadata';

import { CommonResolverProps } from '@really-less/common-resolver';
import { StepFunctionMapResourceMetadata } from '@really-less/step_function';
import { EventResolver } from './event/event';
import { ResourceReflectKeys } from '@really-less/common';

export const parser = async (props: CommonResolverProps) => {
  const { stackResource } = props;

  const eventMetadata: StepFunctionMapResourceMetadata = Reflect.getMetadata(
    ResourceReflectKeys.RESOURCE,
    stackResource
  );

  const stepFunctionResolver = new EventResolver({
    ...props,
    eventMetadata,
  });

  stepFunctionResolver.generate();
};
