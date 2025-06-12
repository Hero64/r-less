import { ResourceReflectKeys } from '@really-less/common';
import type { CommonResolverProps, ParserResolver } from '@really-less/common-resolver';
import {
  RESOURCE_TYPE,
  type StepFunctionMapResourceMetadata,
} from '@really-less/step_function';
import { StepFunctionParserResolver } from './step-function/step-function';

export class StepFunctionResolver implements ParserResolver {
  public type = RESOURCE_TYPE;
  public async parser(props: CommonResolverProps) {
    const { stackResource } = props;

    const stepFunctionMetadata: StepFunctionMapResourceMetadata = Reflect.getMetadata(
      ResourceReflectKeys.RESOURCE,
      stackResource
    );

    const stepFunctionResolver = new StepFunctionParserResolver({
      ...props,
      stepFunctionMetadata,
    });

    stepFunctionResolver.generate();
  }
}
