import { createLambdaDecorator, createResourceDecorator } from '@really-less/common';
import type {
  EventCronMetadata,
  EventCronProps,
  EventRuleMetadata,
  EventRuleProps,
} from './event.types';

export const RESOURCE_TYPE = 'EVENT';

export const Event = createResourceDecorator({
  type: RESOURCE_TYPE,
  callerFileIndex: 5,
});

export const EventRule = createLambdaDecorator<EventRuleProps, EventRuleMetadata>({
  getLambdaMetadata: (props, methodName) => ({
    ...props,
    rule: props.rule || methodName,
    name: methodName,
  }),
});

export const EventCron = createLambdaDecorator<EventCronProps, EventCronMetadata>({
  getLambdaMetadata: (props, methodName) => ({
    ...props,
    name: methodName,
  }),
});
