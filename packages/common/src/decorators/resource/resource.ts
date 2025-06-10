import { basename, dirname } from 'node:path';

import { getCallerFileName } from '../../utils/path';
import { REALLY_LESS_CONTEXT } from '../../constants/env.constants';

export enum ResourceReflectKeys {
  RESOURCE = 'resource',
}

export interface ResourceProps {
  name?: string;
}

export interface ResourceMetadata extends Required<ResourceProps> {
  type: string;
  filename: string;
  foldername: string;
}

interface ResourceDecoratorProps<T> {
  type: string;
  getMetadata?: (props: T) => T;
  callerFileIndex?: number;
}

export const createResourceDecorator =
  <T extends ResourceProps>(decoratorProps: ResourceDecoratorProps<T>) =>
  (props?: T) =>
  (constructor: Function) => {
    if (!process.env[REALLY_LESS_CONTEXT]) {
      return;
    }

    const { type, callerFileIndex, getMetadata = () => props } = decoratorProps;
    const additionalMetadata = getMetadata(props || ({} as T));
    const callerFile = getCallerFileName(callerFileIndex);
    Reflect.defineMetadata(
      ResourceReflectKeys.RESOURCE,
      {
        ...additionalMetadata,
        type,
        name: props?.name || constructor.name,
        foldername: dirname(callerFile),
        filename: basename(callerFile).replace('.js', ''),
      },
      constructor
    );
  };
