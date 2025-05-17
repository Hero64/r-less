import { Duration } from 'aws-cdk-lib';
import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
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
  TaskInput,
  IChainable,
  ProcessorMode,
  ProcessorType,
} from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaReflectKeys, ResourceReflectKeys } from '@really-less/common';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import {
  LambdaTaskMetadata,
  TaskTypes,
  ValidateValues,
  Validations,
  ParamMetadata,
  ParameterItem,
  StepFunctionReflectKeys,
  StepFunctionMapResourceMetadata,
  ProcessorMode as SFProcessorMode,
  ProcessorExecutionType as SFProcessorExecutionType,
  ValidateByType,
} from '@really-less/step_function';
import { CommonResolver } from '@really-less/common-resolver';
import { StepFunctionResourceProps } from './step-function.types';

const processorMode: Record<SFProcessorMode, ProcessorMode> = {
  inline: ProcessorMode.INLINE,
  distributed: ProcessorMode.DISTRIBUTED,
};

const processorExecutionType: Record<SFProcessorExecutionType, ProcessorType> = {
  express: ProcessorType.EXPRESS,
  standard: ProcessorType.STANDARD,
};

export class StepFunctionResolver extends CommonResolver {
  private taskIterator: number = 0;

  constructor(protected props: StepFunctionResourceProps) {
    super(props);
  }

  generate() {
    const { stepFunctionMetadata, stackResource, nestedStack } = this.props;
    const { name, startAt } = stepFunctionMetadata;
    const { lambdas: lambdaTasks, handlers } = this.createLambdaTasks(
      stackResource['prototype']
    );

    new StateMachine(nestedStack.scope, name, {
      definitionBody: DefinitionBody.fromChainable(
        this.nextTask(
          handlers,
          lambdaTasks,
          typeof startAt === 'string' ? startAt : `start-${name}`,
          startAt
        )
      ),
    });
  }

  private createLambdaTasks(resource: { new (...any: []): {} }) {
    const { stepFunctionMetadata } = this.props;
    const handlersMetadata: LambdaTaskMetadata[] = Reflect.getMetadata(
      LambdaReflectKeys.HANDLERS,
      resource
    );
    const lambdas: Record<string, LambdaFunction> = {};
    const handlers: Record<string, LambdaTaskMetadata> = {};

    for (const handler of handlersMetadata) {
      handlers[handler.name] = handler;
      lambdas[handler.name] = this.createLambda({
        pathName: stepFunctionMetadata.foldername,
        filename: stepFunctionMetadata.filename,
        handler,
        prefix: `sf-handler-${stepFunctionMetadata.name}`,
        excludeFiles: ['api', 'event'],
      });
    }

    return {
      lambdas,
      handlers,
    };
  }

  private createTaskParameters(taskName: string) {
    const { stackResource } = this.props;
    const params: Record<string, ParamMetadata[]> =
      Reflect.getMetadata(LambdaReflectKeys.EVENT_PARAM, stackResource.prototype) || {};

    const paramsByMethod = params[taskName];
    if (!paramsByMethod) {
      return undefined;
    }

    const taskParameters: Record<string, string> = {};

    for (const param of paramsByMethod) {
      taskParameters[`${param.name}${param.context !== 'custom' ? '.$' : ''}`] =
        this.parseParam(param);
    }

    return TaskInput.fromObject(taskParameters);
  }

  private createStepFunctionTasks = (
    handlersMetadata: Record<string, LambdaTaskMetadata>,
    lambdaTasks: Record<string, LambdaFunction>,
    taskName: string
  ) => {
    const { nestedStack } = this.props;
    const taskMetadata = handlersMetadata[taskName];

    const task = new LambdaInvoke(nestedStack.scope, `task-${taskName}`, {
      lambdaFunction: lambdaTasks[taskName],
      payload: this.createTaskParameters(taskName),
      resultPath: '$',
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
      return null as unknown as IChainable;
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

    const { nestedStack } = this.props;

    switch (next.type) {
      case 'wait':
        const waitTask = new Wait(
          nestedStack.scope,
          this.getTaskName('wait', originalTaskName),
          {
            time: WaitTime.duration(Duration.seconds(next.seconds)),
          }
        );
        return callNext(waitTask, next.next);
      case 'fail':
        return new Fail(nestedStack.scope, this.getTaskName('fail', originalTaskName), {
          cause: next.cause,
          error: next.error,
        });
      case 'pass':
        const passTask = new Pass(
          nestedStack.scope,
          this.getTaskName('pass', originalTaskName)
        );
        return callNext(passTask, next.next);
      case 'succeed':
        return new Succeed(
          nestedStack.scope,
          this.getTaskName('succeed', originalTaskName)
        );
      case 'choice':
        const choiceTask = new Choice(
          nestedStack.scope,
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
          nestedStack.scope,
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
      case 'map': {
        const mapFlow: StepFunctionMapResourceMetadata = Reflect.getMetadata(
          ResourceReflectKeys.RESOURCE,
          next.itemProcessor
        );

        if (mapFlow.type !== StepFunctionReflectKeys.MAP) {
          throw new Error('Item preprocessor must be a StepFunctionMap');
        }

        const mapTaskName = this.getTaskName('map', originalTaskName);

        const mapTask = new Map(nestedStack.scope, mapTaskName, {
          maxConcurrency: next.maxCurrency,
          itemsPath: this.parseParam(
            this.convertParameterToMetadata(next.itemsPath as ParameterItem)
          ),
          parameters: {
            'index.$': this.parseParam({
              name: 'index',
              context: 'map',
              source: 'index',
            }),
            'value.$': this.parseParam({
              name: 'value',
              context: 'map',
              source: 'value',
            }),
          },
        });

        const { handlers: mapHandlers, lambdas: mapLambdas } = this.createLambdaTasks(
          next.itemProcessor['prototype']
        );

        const itemProcessorTask = this.nextTask(
          mapHandlers,
          mapLambdas,
          typeof mapFlow.startAt === 'string' ? mapFlow.startAt : `start-${mapTaskName}`,
          mapFlow.startAt
        );

        itemProcessorTask &&
          mapTask.itemProcessor(itemProcessorTask, {
            mode: mapFlow.mode ? processorMode[mapFlow.mode] : undefined,
            executionType: mapFlow.executionType
              ? processorExecutionType[mapFlow.executionType]
              : undefined,
          });

        callNext(mapTask, next.next);
        return mapTask;
      }
    }
  };

  private getTaskName = (typeName: string, name: string) => {
    this.taskIterator++;
    return `${typeName}_${name}_${this.taskIterator}`;
  };

  private convertParameterToMetadata(parameter: ParameterItem): ParamMetadata {
    if (typeof parameter === 'string') {
      return {
        context: 'payload',
        source: parameter,
        name: parameter,
      };
    }

    return parameter as ParamMetadata;
  }

  private parseParam = (metadata: ParamMetadata) => {
    const { context, name } = metadata;

    if (context === 'custom') {
      return metadata.value;
    }

    const contextMap: Partial<Record<ParamMetadata['context'], string>> = {
      execution: '$$.Execution',
      input: '$$.Execution.Input',
      state: '$$.State',
      state_machine: '$$.StateMachine',
      payload: '$.',
      map: '$$.Map.Item',
    };

    return `${contextMap[context]}.${(metadata.source as string) || name}`;
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
      this.parseParam(this.convertParameterToMetadata(validate.variable)),
      (validate as ValidateByType<any, any>).value
    );
  };
}
