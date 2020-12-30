import fs from 'fs';
import { promisify } from 'util';
import type Serverless from 'serverless';
import type Plugin from 'serverless/classes/Plugin';
import type Service from 'serverless/classes/Service';

const copyFile = promisify(fs.copyFile);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

interface FunctionDefinition {
  embedded?: {
    files: Array<string>;
    variables: Record<string, string>;
  };
}
interface ServiceWithFunctions extends Service {
  functions: Record<string, FunctionDefinition>;
}

class ServerlessPlugin implements Plugin {
  hooks: Plugin.Hooks;
  private serverless: Serverless;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(serverless: Serverless, options: Record<string, unknown>) {
    this.serverless = serverless;
    // this.options = options;
    this.hooks = {
      'package:initialize': this.beforeBuild.bind(this),
      'package:finalize': this.afterBuild.bind(this),
    };
  }

  async beforeBuild(): Promise<void> {
    const service = this.serverless.service as ServiceWithFunctions;
    await Promise.all(
      Object.values(service.functions).map(async (func) => {
        const embedded = func.embedded;
        if (embedded) {
          await Promise.all(
            embedded.files.map(async (file) => {
              await copyFile(`${file}`, `${file}.org`);
              let result = await readFile(file, 'utf8');
              Object.entries(embedded.variables).forEach(([k2, val]) => {
                result = result.replace(
                  new RegExp('\\${process.env.' + k2 + '}', 'g'),
                  val
                );
                result = result.replace(
                  new RegExp('process.env.' + k2, 'g'),
                  `'${val}'`
                );
              });
              await writeFile(file, result, 'utf8');
            })
          );
        }
      })
    );
  }

  async afterBuild(): Promise<void> {
    const service = this.serverless.service as ServiceWithFunctions;
    await Promise.all(
      Object.values(service.functions).map(async (func) => {
        const embedded = func.embedded;
        if (embedded) {
          await Promise.all(
            embedded.files.map(async (file) => {
              copyFile(`${file}.org`, file);
              unlink(`${file}.org`);
            })
          );
        }
      })
    );
  }
}

export = ServerlessPlugin;
