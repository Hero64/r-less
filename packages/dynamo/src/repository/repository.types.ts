import 'reflect-metadata';
import type { DeepPartial, KeyOfClass, OnlyNumberString } from '@really-less/common';
import type { DynamoIndex, DynamoModelProps } from '../model';

export interface ModelMetadata<T extends Function>
  extends Required<DynamoModelProps<T>> {}

export type OperationExpression<E> =
  | Record<'lessThan', E>
  | Record<'lessOrEqualThan', E>
  | Record<'greaterThan', E>
  | Record<'greaterOrEqualThan', E>
  | Record<'between', [E, E]>;

export type NullExpression = Record<'exist', true> | Record<'notExist', true>;

export type StringExpression = Record<'beginsWith', string>;
export type StringFilterExpression =
  | Record<'contains', string>
  | Record<'notContains', string>;

export type CommonExpression<E> = Record<'notEqual', E> | NullExpression;

export type Filter<E> = {
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

export type OrFilter<E> = {
  OR: Array<Filter<E> | AndFilter<E>>;
};

export type AndFilter<E> = {
  AND: Filter<E> | OrFilter<E>;
};

export type SortDirectionType = 'asc' | 'desc';

export type KeyCondition<E> = {
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

export type Projection<E extends Function> = KeyOfClass<E>[] | 'ALL';

export interface FindProps<E extends Function> {
  projection?: Projection<E>;
  filter?: Filter<E['prototype']> | OrFilter<E['prototype']>;
  sortDirection?: SortDirectionType;
  cursor?: Cursor<E['prototype']>;
  limit?: number;
}

export interface QueryProps<E extends Function> extends FindProps<E> {
  keyCondition: KeyCondition<E['prototype']>;
}

export interface QueryOneProps<E extends Function> extends Omit<QueryProps<E>, 'limit'> {}

export interface Expression {
  expression: string[];
  nameResolver: Record<string, string>;
  valueResolver: Record<string, any>;
}

export interface FilterExpression extends Omit<Expression, 'expression'> {
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

export interface UpsertProps<E extends Function> {
  condition?: Filter<E['prototype']>;
}
