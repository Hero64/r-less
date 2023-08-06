import { basename, dirname } from 'path';

import { getCallerFileName } from '../../utils/path';
import { REALLY_LESS_CONTEXT } from '../../constants/env.constants';

export enum ResourceType {
  API,
  STEP_FUNCTION,
}

export enum ResourceReflectKeys {
  RESOURCE = 'resource',
}

export interface ResourceProps {
  name?: string;
}

export interface ResourceMetadata extends Required<ResourceProps> {
  type: ResourceType;
  filename: string;
  foldername: string;
}

export const createResourceDecorator =
  <T extends ResourceProps>(
    type: ResourceType,
    getMetadata: (props: T) => T,
    callerFileIndex?: number
  ) =>
  (props?: T) =>
  (constructor: Function) => {
    if (!process.env[REALLY_LESS_CONTEXT]) {
      return;
    }

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
