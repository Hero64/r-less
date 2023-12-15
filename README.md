# r-less

It is a simple framework for the AWS stack, created for developers. Forget about configuring YML files and start coding your resources.

![R-LESS](https://i.ibb.co/LJgv0Fg/r-less.png)

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
Es un poco más complejo que eso, pero crear un ApiGateway que responda una lambda es tan simple como el ejemplo.

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
