[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![npm version](https://badge.fury.io/js/serverless-plugin-static-env.svg)](https://badge.fury.io/js/serverless-plugin-static-env)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# Static Env ServerlessFramework Plugin

This plugin is is intended for use with Lambda@Edge to replace `process.env` and other
similar mechanisms referencing environment variables with static values so that environment
specific configuration can be used in Lambda@Edge (which does not support environment variables).

This is forked from [serverless-plugin-embedded-env-in-code](https://github.com/zaru/serverless-plugin-embedded-env-in-code)
with the intention of taking a slightly different approach to the same problem.

This is work in progress, if you're looking for a working solution use [serverless-plugin-embedded-env-in-code](https://github.com/zaru/serverless-plugin-embedded-env-in-code).

## Approach Difference

Rather than using string substution, the intent is to load the module and replace it with a static version of it's exports using
the built in serverless environment options.

The idea is this will provide a more consistent flow with other lambdas (specifying environment on the provider or function)
and also allow less constraints on the configuration file.
