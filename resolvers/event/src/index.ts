import { type ResourceMetadata, ResourceReflectKeys } from '@really-less/common';
import type { CommonResolverProps, ParserResolver } from '@really-less/common-resolver';
import { RESOURCE_TYPE } from '@really-less/event';
import { EventParserResolver } from './event/event';

export class EventResolver implements ParserResolver {
  public type = RESOURCE_TYPE;

  public async parser(props: CommonResolverProps) {
    const { stackResource } = props;

    const eventMetadata: ResourceMetadata = Reflect.getMetadata(
      ResourceReflectKeys.RESOURCE,
      stackResource
    );

    const eventResolver = new EventParserResolver({
      ...props,
      eventMetadata,
    });

    eventResolver.generate();
  }
}
