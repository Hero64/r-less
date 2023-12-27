import { ApiField } from '@really-less/main';

export class GreetingField {
  @ApiField({
    field: 'name',
    required: false,
    source: 'body',
  })
  name: string;

  @ApiField({
    field: 'lastname',
    required: false,
    source: 'body',
  })
  lastName: string;
}
