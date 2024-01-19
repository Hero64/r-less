import {
  LambdaMetadata,
  createLambdaDecorator,
  ResourceType,
  createResourceDecorator,
} from '@really-less/common';

export interface CommonEventProps {
  /**
   * @property {number} maxEventAge - number equivalent to seconds
   */
  maxEventAge?: number;
  /**
   * @property {number} retryAttempts - number of retries
   */
  retryAttempts?: number;
}

export interface EventRuleProps extends CommonEventProps {
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

export interface EventRuleMetadata extends LambdaMetadata, EventRuleProps {}
export interface EventCronMetadata extends LambdaMetadata, EventCronProps {}

export const Event = createResourceDecorator({
  type: ResourceType.EVENT,
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
