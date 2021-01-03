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
  embedded?: boolean;
  environment?: Record<string, unknown>;
  handler: string;
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

const getHandlerBaseFilePath = (func: FunctionDefinition): string =>
  func.handler.substring(0, func.handler.lastIndexOf('.'));

const getHandlerFilePath = (func: FunctionDefinition): string =>
  `${getHandlerBaseFilePath(func)}.js`;

const getEnvFilePath = (func: FunctionDefinition): string =>
  `${getHandlerBaseFilePath(func)}-env.js`;

const getEnvFileRequire = (func: FunctionDefinition): string => {
  const baseFilePath = getHandlerBaseFilePath(func);
  const lastSlash = baseFilePath.lastIndexOf('/');
  const baseName =
    lastSlash === -1 ? baseFilePath : baseFilePath.substring(lastSlash + 1);
  return `./${baseName}-env`;
};

const buildEnvFile = (env: Record<string, string>): string =>
  Object.entries(env)
    .map(
      ([key, value]) =>
        `process.env.${key} = process.env.${key} == null ? ${JSON.stringify(
          value
        )}: process.env.${key};`
    )
    .reduce((buff, line) => buff + line + '\n', '');

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
        return embedded ? [getHandlerFilePath(func)] : [];
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

  async _deleteEnvFiles(): Promise<void> {
    await Promise.all(
      Object.values(this.serverless.service.functions)
        .map((func) => {
          const embedded = func.embedded;
          return embedded ? [getEnvFilePath(func)] : [];
        })
        .reduce((acc, files) => acc.concat(...files), [])
        .map(async (file) => {
          unlink(file);
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
          const envFile = getEnvFilePath(func);
          await writeFile(envFile, buildEnvFile(functionEnvironment), 'utf8');

          const handlerPath = getHandlerFilePath(func);
          const handlerSource = await readFile(handlerPath, 'utf8');
          await writeFile(
            handlerPath,
            `require(${JSON.stringify(
              getEnvFileRequire(func)
            )});\n${handlerSource}`,
            'utf8'
          );
        }
      })
    );
  }

  async afterBuild(): Promise<void> {
    await this._restoreBackups();
    await this._deleteEnvFiles();
  }
}

export = ServerlessPlugin;
