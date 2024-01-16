import { NestedStack, Duration } from 'aws-cdk-lib';
import { Function as LambdaFunction, LayerVersion } from 'aws-cdk-lib/aws-lambda';
import {
  INextable,
  Fail,
  Pass,
  StateMachine,
  Wait,
  WaitTime,
  Succeed,
  Choice,
  Condition,
  Parallel,
  Map,
  DefinitionBody,
} from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import {
  LambdaTaskMetadata,
  StepFunctionResourceMetadata,
  TaskTypes,
  ValidateValues,
  Validations,
  LambdaReflectKeys,
} from '@really-less/main';

import { CommonResource, CommonResourceProps } from './common';
import { Resource } from '../stack';

interface StepFunctionResourceProps extends CommonResourceProps {
  metadata: StepFunctionResourceMetadata;
}

export class StepFunctionResource extends CommonResource {
  private metadata: StepFunctionResourceMetadata;
  private resource: Resource;
  private taskIterator: number = 0;

  constructor(props: StepFunctionResourceProps) {
    const { scope, stackName, resource, metadata, role, layer } = props;
    super(scope, stackName, role, layer);

    this.metadata = metadata;
    this.resource = resource;
  }

  generate() {
    const { startAt, name } = this.metadata;
    const { lambdas: lambdaTasks, handlers } = this.createLambdaTasks();

    new StateMachine(this.scope, name, {
      definitionBody: DefinitionBody.fromChainable(
        this.createStepFunctionTasks(handlers, lambdaTasks, startAt)
      ),
    });
  }

  private createLambdaTasks() {
    const handlersMetadata: LambdaTaskMetadata[] = Reflect.getMetadata(
      LambdaReflectKeys.HANDLERS,
      this.resource.prototype
    );
    const lambdas: Record<string, LambdaFunction> = {};
    const handlers: Record<string, LambdaTaskMetadata> = {};

    for (const handler of handlersMetadata) {
      handlers[handler.name] = handler;
      lambdas[handler.name] = this.createLambda({
        pathName: this.metadata.foldername,
        filename: this.metadata.filename,
        handler,
        prefix: 'sf-handler',
        excludeFiles: ['api', 'event'],
        role: this.role,
        layer: this.layer,
      });
    }

    return {
      lambdas,
      handlers,
    };
  }

  private createStepFunctionTasks = (
    handlersMetadata: Record<string, LambdaTaskMetadata>,
    lambdaTasks: Record<string, LambdaFunction>,
    taskName: string
  ) => {
    const taskMetadata = handlersMetadata[taskName];
    const task = new LambdaInvoke(this.scope, `task-${taskName}`, {
      lambdaFunction: lambdaTasks[taskName],
    });

    const nextTask = this.nextTask(
      handlersMetadata,
      lambdaTasks,
      taskName,
      taskMetadata.next,
      taskMetadata.end
    );

    if (nextTask) {
      task.next(nextTask);
    }

    return task;
  };

  private nextTask = (
    handlersMetadata: Record<string, LambdaTaskMetadata>,
    lambdaTasks: Record<string, LambdaFunction>,
    originalTaskName: string,
    next?: TaskTypes<string>,
    end: boolean = false
  ) => {
    if (!next || end) {
      return;
    }

    if (typeof next === 'string') {
      return this.createStepFunctionTasks(handlersMetadata, lambdaTasks, next);
    }

    const callNext = <S extends INextable>(
      state: S,
      next?: TaskTypes<string>,
      end: boolean = false
    ) => {
      const nextTask = this.nextTask(
        handlersMetadata,
        lambdaTasks,
        originalTaskName,
        next,
        end
      );

      if (nextTask) {
        state.next(nextTask);
      }

      return state;
    };

    switch (next.type) {
      case 'wait':
        const waitTask = new Wait(
          this.scope,
          this.getTaskName('wait', originalTaskName),
          {
            time: WaitTime.duration(Duration.seconds(next.seconds)),
          }
        );
        return callNext(waitTask, next.next);
      case 'fail':
        return new Fail(this.scope, this.getTaskName('fail', originalTaskName), {
          cause: next.cause,
          error: next.error,
        });
      case 'pass':
        const passTask = new Pass(this.scope, this.getTaskName('pass', originalTaskName));
        return callNext(passTask, next.next);
      case 'succeed':
        return new Succeed(this.scope, this.getTaskName('succeed', originalTaskName));
      case 'choice':
        const choiceTask = new Choice(
          this.scope,
          this.getTaskName('choice', originalTaskName)
        );

        next.choices.forEach((choice) => {
          const nextTask: any = this.nextTask(
            handlersMetadata,
            lambdaTasks,
            originalTaskName,
            choice.next
          );

          choiceTask.when(this.parseChoiceTask(choice), nextTask);
        });

        if (next.default) {
          let defaultTask = this.nextTask(
            handlersMetadata,
            lambdaTasks,
            originalTaskName,
            next.default
          );
          if (defaultTask) {
            choiceTask.otherwise(defaultTask);
          }
        }
        return choiceTask;
      case 'parallel':
        const parallelTask = new Parallel(
          this.scope,
          this.getTaskName('parallel', originalTaskName)
        );

        next.branches.forEach((branch) => {
          const nextTask = this.nextTask(
            handlersMetadata,
            lambdaTasks,
            originalTaskName,
            branch
          );
          nextTask && parallelTask.branch(nextTask);
        });

        callNext(parallelTask, next, next.end);

        return parallelTask;
      case 'map':
        const mapTask = new Map(this.scope, this.getTaskName('map', originalTaskName), {
          maxConcurrency: next.maxCurrency,
          itemsPath: next.itemsPath,
          parameters: next.params,
        });

        const iteratorTask = this.nextTask(
          handlersMetadata,
          lambdaTasks,
          originalTaskName,
          next.iterator
        );
        iteratorTask && mapTask.iterator(iteratorTask);

        callNext(mapTask, next.next);
        return mapTask;
    }
  };

  private getTaskName = (typeName: string, name: string) => {
    this.taskIterator++;
    return `${typeName}_${name}_${this.taskIterator}`;
  };

  private parseChoiceTask = (validation: Validations): Condition => {
    if (validation.mode === 'and' || validation.mode === 'or') {
      return Condition[validation.mode](
        ...validation.conditions.map((condition) => this.parseChoiceTask(condition))
      );
    }

    if (validation.mode === 'not') {
      return Condition.not(this.parseChoiceTask(validation.condition));
    }

    const validate = validation as ValidateValues;

    return (Condition[validate.mode] as Function)(
      `$.${validate.variable}`,
      validate.value
    );
  };
}
