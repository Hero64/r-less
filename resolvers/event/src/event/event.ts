import 'reflect-metadata';
import { Duration } from 'aws-cdk-lib';
import {
  type CronOptions,
  EventBus,
  Rule,
  type RuleProps,
  Schedule,
} from 'aws-cdk-lib/aws-events';
import { LambdaFunction as LambdaFunctionTarget } from 'aws-cdk-lib/aws-events-targets';
import { LambdaReflectKeys } from '@really-less/common';

import type { EventCronMetadata, EventRuleMetadata } from '@really-less/event';
import { CommonResolver } from '@really-less/common-resolver';
import type { EventResourceProps } from './event.types';

export class EventParserResolver extends CommonResolver {
  private bus: EventBus;

  constructor(protected props: EventResourceProps) {
    super(props);
  }

  generate() {
    const { stackResource, eventMetadata, nestedStack } = this.props;

    const handlers: (EventRuleMetadata & EventCronMetadata)[] = Reflect.getMetadata(
      LambdaReflectKeys.HANDLERS,
      stackResource.prototype
    );

    for (const handler of handlers) {
      const lambda = this.createLambda({
        pathName: eventMetadata.foldername,
        filename: eventMetadata.filename,
        handler,
        prefix: `event-handler-${eventMetadata.name}`,
        excludeFiles: ['stepfunction', 'api'],
      });

      const ruleProps: { -readonly [key in keyof RuleProps]: RuleProps[key] } = {
        targets: [
          new LambdaFunctionTarget(lambda, {
            retryAttempts: handler.retryAttempts,
            maxEventAge: handler.maxEventAge
              ? Duration.seconds(handler.maxEventAge)
              : undefined,
          }),
        ],
      };

      if (handler.rule) {
        ruleProps.eventBus = this.getBus();
        ruleProps.eventPattern = {
          source: [handler.rule],
        };
      } else {
        ruleProps.schedule =
          typeof handler.schedule === 'string'
            ? Schedule.expression(`cron(${handler.schedule})`)
            : Schedule.cron(handler.schedule as CronOptions);
      }

      new Rule(nestedStack.scope, `event-rule-${handler.name}`, ruleProps);
    }
  }

  private getBus() {
    const { nestedStack, eventMetadata } = this.props;
    if (this.bus) {
      return this.bus;
    }

    this.bus = new EventBus(nestedStack.scope, `event-bus-${eventMetadata.name}`);
    return this.bus;
  }
}
