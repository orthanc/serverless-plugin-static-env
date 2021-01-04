[![npm version](https://badge.fury.io/js/serverless-plugin-static-env.svg)](https://badge.fury.io/js/serverless-plugin-static-env)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# Static Env ServerlessFramework Plugin

This plugin is is intended for use with Lambda@Edge to replace `process.env` and other
similar mechanisms referencing environment variables with static values so that environment
specific configuration can be used in Lambda@Edge (which does not support environment variables).

This is forked from [serverless-plugin-embedded-env-in-code](https://github.com/zaru/serverless-plugin-embedded-env-in-code)
with as it takes a different solution to the same problem of providing environment variables to Lambda@Edge.

In summary, what this does is take all environment variables specified in the `serverless.yml` in
`provider.environment` or `function.environment` and packages them into the deployment zip so they
become defaults if the environment variables defined when the function is executed. Practically speaking
this means any environment variables specified in `provider.environment` or `function.environment` are
available to Lambda@Edge functions the same way as they would to a normal lambda. The key difference being
a redeployment is required to update the values.

# Configuration

Environment variables and their values are configured as normal, either in the top level
[provider.environment](https://www.serverless.com/framework/docs/providers/aws/guide/serverless.yml/)
or [function.engironment](https://www.serverless.com/framework/docs/providers/aws/guide/functions#environment-variables)

When the function is packaged for deployment the values will be embedded in the package so that they are present in `process.env`
as normal. Note that any environment variables actually set in the environment will take precedence,
these are packaged as defaults only.

By default, any function with a [cloudFront event trigger](https://www.serverless.com/framework/docs/providers/aws/events/cloudfront/)
will have it's environment variables embedded during packaging.

A function can explicitly opt in or out of this behavior by specifying the boolean `includeStaticEnv` in the function
definition.

# Example

The below serverless.yml shows the various usages

```
service:
  name: static-env-example

provider:
  name: aws
  runtime: nodejs12.x
  stage: ${opt:stage, 'development'}
  region: 'us-east-1'

  # These environment variables will be made available to all function and included
  # where static environment is embedded
  environment:
    SHARED_ENVIRONMENT_VAR1: 'value1'
    SHARED_ENVIRONMENT_VAR2: 'value2'

plugins:
  - serverless-plugin-static-env

functions:
  edgeFunctionWithStaticEnv:
    handler: dist/endpoints/edgeFunctionWithStaticEnv.handler
    environment:
      FUNCTION_SPECIFIC_ENVIRONMENT_VAR1: 'value3'
      FUNCTION_SPECIFIC_ENVIRONMENT_VAR2: 'value4'
    # includeStaticEnv: true # this will have static env by default because it includes a
                             # cloudFront event trigger. If this was set to false it would
                             # not have a static env even though it has a cloudFront trigger
                             #
                             # Without a cloudFront trigger this would have to be explicitly
                             # set to true to opt in to embedding the static environment
    events:
      - cloudFront:
          eventType: viewer-response
          origin: s3://bucketname.s3.amazonaws.com/files
```

## How it Works

For each function an additional `-env.js` file is generated with the static environment. E.g. with
the example configuration above the file `dist/endpoints/edgeFunctionWithStaticEnv-env.js` would be
generated with the following content

```
process.env["SHARED_ENVIRONMENT_VAR1"] = process.env["SHARED_ENVIRONMENT_VAR1"] == null ? "value1": process.env["SHARED_ENVIRONMENT_VAR1"];
process.env["SHARED_ENVIRONMENT_VAR2"] = process.env["SHARED_ENVIRONMENT_VAR2"] == null ? "value2": process.env["SHARED_ENVIRONMENT_VAR2"];
process.env["FUNCTION_SPECIFIC_ENVIRONMENT_VAR1"] = process.env["FUNCTION_SPECIFIC_ENVIRONMENT_VAR1"] == null ? "value3": process.env["FUNCTION_SPECIFIC_ENVIRONMENT_VAR1"];
process.env["FUNCTION_SPECIFIC_ENVIRONMENT_VAR2"] = process.env["FUNCTION_SPECIFIC_ENVIRONMENT_VAR2"] == null ? "value4": process.env["FUNCTION_SPECIFIC_ENVIRONMENT_VAR2"];
```

The file `dist/endpoints/edgeFunctionWithStaticEnv.js` would also be updated to require `dist/endpoints/edgeFunctionWithStaticEnv-env.js`
as it's first action ensuring that these variables are present before any other required code is executed.
