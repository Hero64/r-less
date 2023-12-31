import 'reflect-metadata';
import {
  DynamoDBClient,
  QueryCommand,
  ScanCommand,
  QueryCommandInput,
  ScanCommandInput,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
} from '@aws-sdk/client-dynamodb';
import { captureAWSv3Client } from 'aws-xray-sdk';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

import {
  DynamoModelProps,
  DynamoIndex,
  ModelMetadataKeys,
} from '../../decorators/dynamo/dynamo';
import { DeepPartial, KeyOfClass, OnlyNumberString } from '../../types/utils';

export interface ModelMetadata<T extends Function>
  extends Required<DynamoModelProps<T>> {}

type OperationExpression<E> =
  | Record<'lessThan', E>
  | Record<'lessOrEqualThan', E>
  | Record<'greaterThan', E>
  | Record<'greaterOrEqualThan', E>
  | Record<'between', [E, E]>;

type NullExpression = Record<'exist', true> | Record<'notExist', true>;

type StringExpression = Record<'beginsWith', string>;
type StringFilterExpression = Record<'contains', string> | Record<'notContains', string>;

type CommonExpression<E> = Record<'notEqual', E> | NullExpression;

type Filter<E> = {
  [key in keyof E]?: E[key] extends string | number | boolean | Date | null
    ?
        | E[key]
        | (E[key] extends number
            ? OperationExpression<number> | CommonExpression<number>
            : E[key] extends boolean
            ? CommonExpression<boolean>
            : E[key] extends null
            ? NullExpression
            : StringExpression | StringFilterExpression | CommonExpression<string>)
    : DeepPartial<Filter<E[key]>>;
};

type OrFilter<E> = {
  OR: Array<Filter<E> | AndFilter<E>>;
};

type AndFilter<E> = {
  AND: Filter<E> | OrFilter<E>;
};

type SortDirectionType = 'asc' | 'desc';

type KeyCondition<E> = {
  partition: Partial<OnlyNumberString<E>>;
  sort?: {
    [key in keyof E as E[key] extends number | string ? key : never]?:
      | E[key]
      | (E[key] extends number
          ? OperationExpression<E[key]>
          : OperationExpression<E[key]> | StringExpression);
  };
};

export type Item<E extends Function> = {
  [key in keyof E['prototype']]: E['prototype'][key];
};

export type Cursor<E extends Function> = Partial<E>;

type Projection<E extends Function> = KeyOfClass<E>[] | 'ALL';

interface FindProps<E extends Function> {
  projection?: Projection<E>;
  filter?: Filter<E['prototype']> | OrFilter<E['prototype']>;
  sortDirection?: SortDirectionType;
  cursor?: Cursor<E['prototype']>;
  limit?: number;
}

interface QueryProps<E extends Function> extends FindProps<E> {
  keyCondition: KeyCondition<E['prototype']>;
}

interface QueryOneProps<E extends Function> extends Omit<QueryProps<E>, 'limit'> {}

export interface Expression {
  expression: string[];
  nameResolver: Record<string, string>;
  valueResolver: Record<string, any>;
}

export interface ConditionExpression extends Omit<Expression, 'expression'> {
  expression: string;
}

export interface ExecQueryProps<E extends Function> {
  condition?: string;
  index?: DynamoIndex<E>;
  filter?: string;
  names?: Record<string, string>;
  values?: Record<string, any>;
  limit?: number;
  cursor?: Cursor<E['prototype']>;
  sort?: SortDirectionType;
  projection?: Projection<E>;
}

export interface QueryResponse<E extends Function> {
  data: Partial<E['prototype']>[];
  cursor?: Cursor<E['prototype']>;
}

export interface UpdateProps<E extends Function> {
  keyCondition: Partial<Item<E>>;
  values: Partial<Item<E>>;
}

const expressionResolver = <V>(key: string, value: V, sign: string) => {
  return `${key} ${sign} :${value}`;
};

const filterResolver = {
  lessThan: (key: string, value: string) => {
    return expressionResolver(key, value, '<');
  },
  lessOrEqualThan: (key: string, value: string) => {
    return expressionResolver(key, value, '<=');
  },
  greaterThan: (key: string, value: string) => {
    return expressionResolver(key, value, '>');
  },
  greaterOrEqualThan: (key: string, value: string) => {
    return expressionResolver(key, value, '>=');
  },
  between: (key: string, value: string) => {
    return `${key} BETWEEN :${value}_0 and :${value}_1`;
  },
  beginsWith: (key: string, value: string) => {
    return `begins_with(:${value}, ${key})`;
  },
  contains: (key: string, value: string) => {
    return `contains(:${value}, ${key})`;
  },
  exist: (key: string) => {
    return `exist(:${key})`;
  },
  notExist: (key: string) => {
    return `notExist(${key})`;
  },
  notEqual: (key: string, value: string) => {
    return expressionResolver(key, value, '<>');
  },
};

const notValueKeys = new Set(['exist', 'notExist']);

type ResolverTypes = keyof typeof filterResolver;

const getConfig = () => {
  const mockEndpoint = process.env.MOCK_DYNAMODB_ENDPOINT;
  if (mockEndpoint) {
    return {
      endpoint: mockEndpoint,
      sslEnabled: false,
      region: 'local',
    };
  }

  return {};
};

export let client = new DynamoDBClient(getConfig());

export const createRepository = <E extends { new (...args: any[]): {} }>(model: E) => {
  const modelProps: ModelMetadata<E> = Reflect.getMetadata(
    ModelMetadataKeys.MODEL,
    model
  );
  const partitionKey: string = Reflect.getMetadata(
    ModelMetadataKeys.PARTITION_KEY,
    model['prototype']
  );

  const sortKey: string | undefined = Reflect.getMetadata(
    ModelMetadataKeys.SORT_KEY,
    model['prototype']
  );

  if (modelProps.tracing) {
    client = captureAWSv3Client(client);
  }

  const getIndex = (props: QueryProps<E>) => {
    const {
      keyCondition: { partition, sort },
    } = props;

    const keysInPartition = Object.keys(partition);
    const keysInSort = Object.keys(sort || {});

    if (keysInPartition.length > 1 || keysInSort.length > 1) {
      throw new Error('Should use only item from partition and sort key');
    }

    const selectedPartitionKey = keysInPartition[0];
    const selectedSortKey = keysInSort[0];

    if (selectedPartitionKey === partitionKey && (!sort || selectedSortKey === sortKey)) {
      return;
    }

    const { indexes } = modelProps;

    const selectedIndex = indexes.find(
      (index) =>
        index.partitionKey === selectedPartitionKey &&
        (!sort || selectedSortKey === index.sortKey)
    );

    if (!selectedIndex) {
      throw new Error('Partition key or sort key not found');
    }

    return selectedIndex;
  };

  const validateIndex = (props: QueryProps<E>, index?: DynamoIndex<E>) => {
    const { filter } = props;
    if (!filter) {
      return;
    }
    let conditionKeys: [string, string | undefined] = [partitionKey, sortKey];

    if (index) {
      conditionKeys = [index.partitionKey as string, index.sortKey as string];
    }

    let filterKeys = new Set<string>([]);
    if (Array.isArray(filter.OR)) {
      for (const condition of filter.OR) {
        Object.keys(condition).forEach(filterKeys.add, filterKeys);
        if (condition.AND) {
          Object.keys(condition.AND).forEach(filterKeys.add, filterKeys);
        }
      }
    } else {
      filterKeys = new Set([...Object.keys(filter)]);
    }

    if (filterKeys.has(conditionKeys[0]) || filterKeys.has(conditionKeys[1] as string)) {
      throw new Error('Partition and sort key should not be in the filter condition');
    }
  };

  const getConditionExpression = (expression: KeyCondition<E>) => {
    const { partition, sort } = expression;
    const partitionName = Object.keys(partition)[0];

    const filterExpression: ConditionExpression = {
      expression: `#${partitionName} = :${partitionName}`,
      nameResolver: {
        [`#${partitionName}`]: partitionName,
      },
      valueResolver: {
        [`:${partitionName}`]:
          partition[partitionName as keyof Partial<OnlyNumberString<E>>],
      },
    };

    if (!sort) {
      return filterExpression;
    }
    filterExpression.expression += ' and ';

    const sortName = Object.keys(sort)[0];
    const sortValue = (sort as any)[sortName];
    const valueSortName = `${sortName}_sort`;

    if (typeof sortValue === 'object' && sortValue) {
      const resolverName = Object.keys(sortValue || {});
      const values = (sortValue as any)[resolverName[0]];
      filterExpression.expression += filterResolver[resolverName[0] as ResolverTypes](
        `#${sortName}`,
        valueSortName
      );
      if (Array.isArray(values)) {
        values.forEach((value, index) => {
          filterExpression.valueResolver[`:${valueSortName}_${index}`] = value;
        });
      } else {
        filterExpression.valueResolver[`:${valueSortName}`] = values;
      }
    } else {
      filterExpression.valueResolver[`:${valueSortName}`] = (sort as any)[sortName];
      filterExpression.expression += `#${sortName} = :${valueSortName}`;
    }
    filterExpression.nameResolver[`#${sortName}`] = sortName;

    return filterExpression;
  };

  const getFilterExpression = <T>(
    filter: Filter<T> | OrFilter<T> | AndFilter<T>,
    names: string[] = [],
    union: 'or' | 'and' = 'and',
    counter: number = 0
  ) => {
    counter += 1;
    let filterExpression: Expression = {
      expression: [],
      nameResolver: {},
      valueResolver: {},
    };
    let index = 0;
    for (const key in filter) {
      switch (key) {
        case 'OR': {
          const orFilter = filter as OrFilter<T>;
          const orExpressions: string[] = [];
          for (const condition of orFilter['OR']) {
            const { expression, nameResolver, valueResolver } = getFilterExpression(
              condition,
              names,
              'and',
              counter
            );
            orExpressions.push(expression);
            filterExpression = {
              ...filterExpression,
              nameResolver: {
                ...filterExpression.nameResolver,
                ...nameResolver,
              },
              valueResolver: {
                ...filterExpression.valueResolver,
                ...valueResolver,
              },
            };
          }

          filterExpression.expression.push(`(${orExpressions.join(' or ')})`);
          break;
        }
        case 'AND': {
          const andFilter = filter as AndFilter<T>;
          const { expression, nameResolver, valueResolver } = getFilterExpression(
            andFilter['AND'],
            names,
            'and',
            counter
          );
          filterExpression = {
            expression: [...filterExpression.expression, expression],
            nameResolver: {
              ...filterExpression.nameResolver,
              ...nameResolver,
            },
            valueResolver: {
              ...filterExpression.valueResolver,
              ...valueResolver,
            },
          };

          filterExpression.expression = [
            `(${filterExpression.expression.join(' and ')})`,
          ];
          break;
        }
        default: {
          const currentKeyNames = [...names, key];
          const keyName = currentKeyNames.join('.#');
          const keyValue = `${currentKeyNames.join('_')}_${counter}_${index}`;

          const nameResolver = Object.fromEntries(
            currentKeyNames.map((name) => [`#${name}`, name])
          );

          const keyFilter = (filter as Filter<T>)[key as keyof T] as Filter<T>;

          if (typeof keyFilter === 'object') {
            const keys = Object.keys(keyFilter || {});
            const methods: ResolverTypes[] = [];

            for (const resolverName in filterResolver) {
              if (keys.includes(resolverName)) {
                methods.push(resolverName as ResolverTypes);
              }
            }

            if (methods.length === 0) {
              const { expression, nameResolver, valueResolver } = getFilterExpression(
                keyFilter,
                [...names, key],
                union
              );
              filterExpression = {
                expression: [...filterExpression.expression, expression],
                nameResolver: {
                  ...filterExpression.nameResolver,
                  ...nameResolver,
                },
                valueResolver: {
                  ...filterExpression.valueResolver,
                  ...valueResolver,
                },
              };
              break;
            }

            if (methods.length > 1) {
              throw new Error(`Key ${key} should have only one condition`);
            }

            const method = methods[0];
            filterExpression.expression.push(
              filterResolver[method](`#${keyName}`, keyValue)
            );
            if (!notValueKeys.has(method)) {
              filterExpression.valueResolver = {
                ...filterExpression.valueResolver,
                [`:${keyValue}`]: (keyFilter as any)[method],
              };
            }
          } else {
            filterExpression.expression.push(`#${keyName} = :${keyValue}`);
            filterExpression.valueResolver = {
              ...filterExpression.valueResolver,
              [`:${keyValue}`]: keyFilter,
            };
          }
          filterExpression.nameResolver = {
            ...filterExpression.nameResolver,
            ...nameResolver,
          };
        }
      }
      index++;
    }

    return {
      ...filterExpression,
      expression: `(${filterExpression.expression.join(` ${union} `)})`,
    };
  };

  const execQuery = async (props: ExecQueryProps<E>) => {
    const {
      condition,
      index,
      filter,
      names,
      values,
      cursor,
      limit,
      sort = 'asc',
      projection = 'ALL',
    } = props;

    return runQuery(
      {
        TableName: modelProps.name,
        IndexName: index?.name,
        KeyConditionExpression: condition,
        FilterExpression: filter,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values ? marshall(values) : undefined,
        ExclusiveStartKey: cursor ? marshall(cursor) : undefined,
        Limit: limit,
        ScanIndexForward: sort === 'asc',
        ProjectionExpression: projection === 'ALL' ? undefined : projection.join(', '),
      },
      condition ? QueryCommand : ScanCommand
    );
  };

  const runQuery = async (
    input: QueryCommandInput | ScanCommandInput,
    commandClass: typeof QueryCommand | typeof ScanCommand,
    data: Partial<E[]> = []
  ): Promise<QueryResponse<E>> => {
    const command = new commandClass(input);
    const { Items = [], LastEvaluatedKey } = await client.send(command);
    const resultData = Items.map((item) => unmarshall(item)) as E[];

    if (input.Limit === 1) {
      return {
        data: [resultData[0]],
        cursor: LastEvaluatedKey ? unmarshall(LastEvaluatedKey) : undefined,
      };
    }

    let items = data.concat(resultData);
    if (LastEvaluatedKey && (!input.Limit || items.length < input.Limit)) {
      return runQuery(
        {
          ...input,
          ExclusiveStartKey: LastEvaluatedKey,
          Limit: input.Limit ? input.Limit - items.length : undefined,
        },
        commandClass,
        items
      );
    }

    return {
      data: items as E[],
      cursor: LastEvaluatedKey ? unmarshall(LastEvaluatedKey) : undefined,
    };
  };

  const validateKey = (key: Partial<Item<E>>) => {
    const keys = new Set(Object.keys(key));

    if (
      keys.size > 3 ||
      !keys.has(partitionKey) ||
      (keys.size === 2 && sortKey && !keys.has(sortKey))
    ) {
      throw new Error('Key are only composed of partition and sort key');
    }
  };

  class Repository extends model {
    async findOne(props: QueryOneProps<E>) {
      const { data } = await this.findAll({
        ...props,
        limit: 1,
      });

      return data?.[0];
    }

    findAll(props: QueryProps<E>) {
      const index = getIndex(props);
      const queryExpressions = getConditionExpression(props.keyCondition);
      let filterExpression: string | undefined = undefined;
      if (props.filter) {
        validateIndex(props, index);
        const { expression, nameResolver, valueResolver } = getFilterExpression(
          props.filter || {}
        );
        filterExpression = expression;
        queryExpressions.nameResolver = {
          ...queryExpressions.nameResolver,
          ...nameResolver,
        };
        queryExpressions.valueResolver = {
          ...queryExpressions.valueResolver,
          ...valueResolver,
        };
      }

      return execQuery({
        index,
        filter: filterExpression,
        names: queryExpressions.nameResolver,
        values: queryExpressions.valueResolver,
        condition: queryExpressions.expression,
        limit: props.limit,
        cursor: props.cursor,
        sort: props.sortDirection,
        projection: props.projection,
      });
    }

    scan(props: FindProps<E> = {}) {
      const { limit, cursor, filter, sortDirection, projection } = props;

      const queryOptions: ExecQueryProps<E> = {
        limit,
        cursor,
        projection,
        sort: sortDirection,
      };

      if (filter) {
        const filterExpression = getFilterExpression(props.filter || {});
        queryOptions.filter = filterExpression.expression;
        queryOptions.names = filterExpression.nameResolver;
        queryOptions.values = filterExpression.valueResolver;
      }

      return execQuery(queryOptions);
    }

    async create(item: Item<E>) {
      const command = new PutItemCommand({
        TableName: modelProps.name,
        Item: marshall(item),
      });

      await client.send(command);

      return item;
    }

    async update(props: UpdateProps<E>) {
      const { keyCondition, values } = props;
      validateKey(keyCondition);

      const updateValues: string[] = [];
      const removeValues: string[] = [];
      const names = Object.keys(values);
      const updatedNames = [];
      for (const name of names) {
        if (values[name] === undefined) {
          removeValues.push(`#${name}`);
        } else {
          updateValues.push(`#${name} = :${name}`);
          updatedNames.push(name);
        }
      }

      let expression = [];
      if (updateValues.length) {
        expression.push(`SET ${updateValues.join(', ')}`);
      }

      if (removeValues.length) {
        expression.push(`REMOVE ${updateValues.join(', ')}`);
      }

      expression.join(' ');

      const command = new UpdateItemCommand({
        TableName: modelProps.name,
        Key: marshall(keyCondition),
        UpdateExpression: expression.join(' '),
        ExpressionAttributeNames: Object.fromEntries(
          names.map((name) => [`#${name}`, name])
        ),
        ExpressionAttributeValues: marshall(
          Object.fromEntries(
            updatedNames.map((name) => [`:${name}`, values[name as any]])
          )
        ),
      });

      await client.send(command);
      return true;
    }

    async delete(key: Partial<Item<E>>) {
      validateKey(key);
      const command = new DeleteItemCommand({
        TableName: modelProps.name,
        Key: marshall(key),
      });

      await client.send(command);
    }
  }

  return new Repository();
};
