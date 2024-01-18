import { Param } from '@really-less/api';

export class GreetingFieldBase {
  @Param({
    required: true,
    source: 'path',
  })
  id: number;
}

export class GreetingField extends GreetingFieldBase {
  @Param({
    required: false,
    source: 'body',
  })
  name?: string;

  @Param({
    name: 'lastname',
    required: false,
    source: 'body',
  })
  lastName?: string;
}
