import fs from 'fs';
import { promisify } from 'util';
import type Serverless from 'serverless';
import type Plugin from 'serverless/classes/Plugin';
import { env } from 'process';

class ServerlessPlugin implements Plugin {
  hooks: Plugin.Hooks;
  private serverless: Serverless;

  constructor(serverless: Serverless, options: Record<string, unknown>) {
    this.serverless = serverless;
    // this.options = options;
    this.hooks = {
      'package:initialize': this.beforeBuild.bind(this),
      'package:finalize': this.afterBuild.bind(this),
    };
  }

  async beforeBuild(): Promise<void> {
    console.log(
      JSON.stringify({ before: this.serverless.service.provider }, undefined, 2)
    );
    console.log(this.serverless.service.getAllFunctions());
    console.log(
      JSON.stringify(
        {
          before: ((this.serverless.service as unknown) as Record<
            string,
            unknown
          >).functions,
        },
        undefined,
        2
      )
    );
    //   Object.keys(this.serverless.service.functions).forEach((k) => {
    //     const func = this.serverless.service.functions[k];
    //     if (func.embedded) {
    //       func.embedded.files.forEach((file) => {
    //         fs.copyFileSync(`${file}`, `${file}.org`, (e) => {
    //           console.log(e);
    //         });
    //         let result = fs.readFileSync(file, 'utf8');
    //         Object.keys(func.embedded.variables).forEach((k2) => {
    //           const val = func.embedded.variables[k2];
    //           result = result.replace(
    //             new RegExp('\\${process.env.' + k2 + '}', 'g'),
    //             val
    //           );
    //           result = result.replace(
    //             new RegExp('process.env.' + k2, 'g'),
    //             `'${val}'`
    //           );
    //         });
    //         fs.writeFileSync(file, result, 'utf8');
    //       });
    //     }
    //   });
  }

  async afterBuild(): Promise<void> {
    console.log(
      JSON.stringify({ after: this.serverless.service.custom }, undefined, 2)
    );
    //   Object.keys(this.serverless.service.functions).forEach((k) => {
    //     const func = this.serverless.service.functions[k];
    //     if (func.embedded) {
    //       func.embedded.files.forEach((file) => {
    //         fs.copyFileSync(`${file}.org`, file);
    //         fs.unlinkSync(`${file}.org`);
    //       });
    //     }
    //   });
  }
}

export = ServerlessPlugin;
