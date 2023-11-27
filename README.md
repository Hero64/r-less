# R-LESS

It is a simple framework for the AWS stack created for developers. Forget about configuring YML files and start coding your resources.

## How work

Write your resource and enjoy :):

```typescript
import { Api, Get } from '@really-less/decorators';

@Api({
  path: 'example',
})
export class ExampleApi {
  @Get({
    path: '/hello',
  })
  sayHello() {
    console.log('Hello');
  }
}
```
It's a bit more complex than that, but creating an ApiGateway that responds to a lambda is just simple as the example.

# Roadmap

- [ ] Api Gateway
	- [x] Lambda integration
	- [ ] Service integration
	- [ ] Api Grateway configuration
- [ ] Step Functions
	- [x] Lambda integration
	- [ ]  Service integration
	- [ ] Params resolution
- [x] Event Bridge
	- [x]  Rule Events
	- [x] Cron
- [ ]  Standalone Lambda
- [x] CLI
  - [x] Lambda export
  - [x] Project layer generation
  - [ ] Layer per lambda 
- [ ] Role resolution
- [ ] Resource configuration
- [ ] VPC
- [ ] Service Helpers
  - [ ] S3
  - [ ] Dynamo
  - [ ] Cloudfront
