import 'reflect-metadata';
import { Duration } from 'aws-cdk-lib';
import { CronOptions, EventBus, Rule, RuleProps, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction as LambdaFunctionTarget } from 'aws-cdk-lib/aws-events-targets';
import { LambdaReflectKeys, ResourceMetadata } from '@really-less/common';

import { Resource } from '../stack';
import { CommonResource, CommonResourceProps } from './common';
import { EventCronMetadata, EventRuleMetadata } from '@really-less/event';

interface EventResourceProps extends CommonResourceProps {
  metadata: ResourceMetadata;
}

export class EventResource extends CommonResource {
  private resource: Resource;
  private metadata: ResourceMetadata;
  private bus: EventBus;

  constructor(props: EventResourceProps) {
    const { scope, stackName, resource, metadata } = props;
    super(scope, stackName);
    this.resource = resource;
    this.metadata = metadata;
  }

  generate() {
    const handlers: (EventRuleMetadata & EventCronMetadata)[] = Reflect.getMetadata(
      LambdaReflectKeys.HANDLERS,
      this.resource.prototype
    );

    for (const handler of handlers) {
      const lambda = this.createLambda({
        pathName: this.metadata.foldername,
        filename: this.metadata.filename,
        handler,
        prefix: 'event-handler',
        excludeFiles: ['stepfunction', 'api'],
      });

      let ruleProps: { -readonly [key in keyof RuleProps]: RuleProps[key] } = {
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

      new Rule(this.scope, `event-rule-${handler.name}`, ruleProps);
    }
  }

  private getBus() {
    if (this.bus) {
      return this.bus;
    }

    this.bus = new EventBus(this.scope, `event-bus-${this.metadata.name}`);
    return this.bus;
  }
}
