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
  };
  environment?: Record<string, unknown>;
}
type ServiceWithFunctions = Service & {
  functions: Record<string, FunctionDefinition>;
  provider: { environment?: Record<string, unknown> };
};

const toStringEnvironment = (env: Record<string, unknown> | undefined) =>
  env
    ? Object.fromEntries(
        Object.entries(env).map(([key, val]) => [key, String(val)])
      )
    : {};

class ServerlessPlugin implements Plugin {
  hooks: Plugin.Hooks;
  private serverless: Serverless & { service: ServiceWithFunctions };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(serverless: Serverless, options: Record<string, unknown>) {
    this.serverless = serverless as Serverless & {
      service: ServiceWithFunctions;
    };
    // this.options = options;
    this.hooks = {
      'package:initialize': this.beforeBuild.bind(this),
      'package:finalize': this.afterBuild.bind(this),
    };
  }

  _filesToBackup(): Array<string> {
    return Object.values(this.serverless.service.functions)
      .map((func) => {
        const embedded = func.embedded;
        return embedded ? embedded.files : [];
      })
      .reduce((acc, files) => acc.concat(...files), []);
  }

  async _backupFiles(): Promise<void> {
    await Promise.all(
      this._filesToBackup().map(async (file) => {
        await copyFile(`${file}`, `${file}.org`);
      })
    );
  }

  async _restoreBackups(): Promise<void> {
    await Promise.all(
      this._filesToBackup().map(async (file) => {
        copyFile(`${file}.org`, file);
        unlink(`${file}.org`);
      })
    );
  }

  async beforeBuild(): Promise<void> {
    await this._backupFiles();

    const serviceEnvironment = toStringEnvironment(
      this.serverless.service.provider.environment
    );
    await Promise.all(
      Object.values(this.serverless.service.functions).map(async (func) => {
        const embedded = func.embedded;
        if (embedded) {
          const functionEnvironment = {
            ...serviceEnvironment,
            ...toStringEnvironment(func.environment),
          };
          await Promise.all(
            embedded.files.map(async (file) => {
              let result = await readFile(file, 'utf8');
              Object.entries(functionEnvironment).forEach(([k2, val]) => {
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
    await this._restoreBackups();
  }
}

export = ServerlessPlugin;
