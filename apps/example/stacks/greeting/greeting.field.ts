import { ApiField } from '@really-less/main';

export class GreetingFieldBase {
  @ApiField({
    required: true,
    source: 'path',
  })
  id: number;
}

export class GreetingField extends GreetingFieldBase {
  @ApiField({
    field: 'name',
    required: false,
    source: 'body',
  })
  name?: string;

  @ApiField({
    field: 'lastname',
    required: false,
    source: 'body',
  })
  lastName?: string;
}
