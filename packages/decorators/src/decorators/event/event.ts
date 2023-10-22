import { LambdaMetadata, createLambdaDecorator } from '../lambda/lambda';
import { ResourceType, createResourceDecorator } from '../resource/resource';

export interface EventRuleProps {
  rule?: string;
}

type ScheduleExpressions = number | '*' | '?' | `${number}-${number}` | `*/${number}`;

interface ScheduleTime {
  day?: ScheduleExpressions;
  hour?: ScheduleExpressions;
  minute?: ScheduleExpressions;
  month?: ScheduleExpressions;
  weekDay?: ScheduleExpressions;
  year?: ScheduleExpressions;
}

export interface EventCronProps {
  schedule: string | ScheduleTime;
}

export interface EventRuleMetadata extends LambdaMetadata, Required<EventRuleProps> {}
export interface EventCronMetadata extends LambdaMetadata, EventCronProps {}

export const Event = createResourceDecorator({
  type: ResourceType.EVENT,
  callerFileIndex: 5,
});

export const EventRule = createLambdaDecorator<EventRuleProps, EventRuleMetadata>(
  (props, methodName) => ({
    ...props,
    rule: props.rule || methodName,
    name: methodName,
  })
);

export const EventCron = createLambdaDecorator<EventCronProps, EventCronMetadata>(
  (props, methodName) => ({
    ...props,
    name: methodName,
  })
);
