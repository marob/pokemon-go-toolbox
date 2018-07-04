import {IncomingMessage} from 'http';
import {Injectable} from '@angular/core';
import ScreenSize from '../dto/screenSize';
import * as path from 'path';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as https from 'https';
import * as unzip from 'unzip-stream/unzip';
import {SpawnSyncOptions, SpawnSyncReturns} from 'child_process';

const Jimp = window.require('jimp');

const node = {
  childProcess: window.require('child_process') as typeof childProcess,
  path: window.require('path') as typeof path,
  fs: window.require('fs') as typeof fs,
  https: window.require('https') as typeof https,
  unzip: window.require('unzip-stream/unzip') as typeof unzip,
};

@Injectable()
export class AdbService {
  platformToolsPath = node.path.resolve('platform-tools');
  private waitIfPosedPromise: Promise<void>;
  private screenSizeCache: ScreenSize;

  private exec$ = (command, options?): Promise<{ stdout: string, stderr: string }> => {
    return new Promise<{ stdout: string, stderr: string }>((resolve, reject) => {
      node.childProcess.exec(command,
        {
          cwd: this.platformToolsPath,
          encoding: 'utf8', ...options
        },
        (error: Error, stdout: string, stderr: string) => {
          if (error) {
            reject(error);
          } else {
            resolve({stdout, stderr});
          }
        }
      );
    });
  };

  public resume: () => void = () => undefined;

  constructor() {
  }

  public async init() {
    if (!node.fs.existsSync(this.platformToolsPath)) {
      console.log('Downloading platform tools (first launch only)...');
      await this.downloadPlatformTools();
      console.log(`Platform tools downloaded in ${this.platformToolsPath}`);
    }
    await this.startServer();
  }

  private async downloadPlatformTools() {
    return new Promise((resolve) => {
      const platform =
        process.platform === 'darwin' ? 'darwin'
          : process.platform === 'linux' ? 'linux'
          : process.platform === 'win32' ? 'windows'
            : undefined;
      if (!platform) {
        throw new Error('Unhandled platform!');
      }
      node.fs.mkdirSync(this.platformToolsPath);
      node.https.get(
        `https://dl.google.com/android/repository/platform-tools_r28.0.0-${platform}.zip`,
        (res: IncomingMessage) => {
          res
            .pipe(node.unzip.Extract({path: '.'}))
            .on('close', () => {
              if (platform !== 'windows') {
                node.fs.chmodSync('./platform-tools/adb', 0o744);
              }
              resolve();
            });
        }
      );
    });
  }

  private async startServer() {
    console.log('Starting adb server...');
    await this.exec$('adb start-server');
    console.log('adb server started');
  }

  public async devices(): Promise<string[]> {
    const {stdout, stderr} = await this.exec$('adb devices');
    if (stderr) {
      console.error(stderr);
    }
    return stdout
      .replace('\r', '')
      .split('\n')
      .slice(1)
      .filter((line) => line.includes('device'))
      .map((line) => line.split('\t')[0])
      ;
  }

  public async rawScreenshot(): Promise<Buffer> {
    const spawnSync: (command, args?, options?) => SpawnSyncReturns<Buffer> =
      (command, args?, options?) => node.childProcess.spawnSync(
        command,
        args,
        {cwd: this.platformToolsPath, ...options} as SpawnSyncOptions
      );
    const {status, error, stdout, stderr} = spawnSync('adb', ['exec-out', 'screencap', '-p']);

    if (status === 0) {
      return stdout;
    } else {
      throw error;
    }
  }

  public async screenshot(): Promise<Jimp.Jimp> {
    const jimp = await Jimp.read(await this.rawScreenshot());
    if (process.env.LOG_SCREENSHOT === 'true') {
      const screenshotPath = `log/${Date.now()}.png`;
      console.log(`Logging screenshot to ${screenshotPath}`);
      jimp.write(screenshotPath);
    }
    return jimp;
  }

  public async screenSize(): Promise<ScreenSize> {
    if (this.screenSizeCache) {
      return this.screenSizeCache;
    }

    const {stdout} = await this.shell('wm size');
    const sizes: [number, number] = stdout
      .trim()
      .split('\n')
      .map((line) => /([0-9]+)x([0-9]+)/
        .exec(line)
        .slice(1, 3)
        .map((x) => Number.parseInt(x)) as [number, number],
      )
      .reduce((smallest, current) => {
        return (!smallest || (smallest[0] > current[0] || smallest[1] > current[1]))
          ? current
          : smallest;
      }, null)
    ;
    this.screenSizeCache = new ScreenSize(sizes[0], sizes[1]);
    return this.screenSizeCache;
  }

  public async getFocusedApp(): Promise<string> {
    const {stdout} = await this.shell('dumpsys window windows | grep -E "mFocusedApp"');
    return stdout;
  }

  public pause() {
    if (!this.waitIfPosedPromise) {
      console.log('You quit PokemonGO. Interactions are paused...');
      this.waitIfPosedPromise = new Promise<void>((resolve) => {
        this.resume = () => {
          console.log('Back to PokemonGO. Resuming interactions...');
          resolve();
          delete this.waitIfPosedPromise;
          this.resume = () => undefined;
        };
      });
    }
  }

  public async tap([x, y]: [number, number]) {
    await this.waitIfPosedPromise;
    return await this.shell(`input tap ${x} ${y}`);
  }

  public async shell(command: string): Promise<{ stdout: string, stderr: string }> {
    const start = Date.now();
    const shellCommand = `adb shell "${command}"`;
    const result = await this.exec$(shellCommand);
    console.log(`ADB: (${Date.now() - start}) ${shellCommand}`);
    return result;
  }

  public async getApiLevel(): Promise<number> {
    const {stdout} = await this.shell('getprop ro.build.version.sdk');
    return Number.parseInt(stdout.trim());
  }

  public async startApp(appName: string) {
    return await this.shell(`monkey -p ${appName} 1`);
  }

  public async paste() {
    return await this.keyevent(279);
  }

  public async back() {
    return await this.keyevent(4);
  }

  public async install(apkPath: string) {
    return await this.exec$(`adb install ${apkPath}`);
  }

  public async uninstall(packageName: string) {
    return await this.exec$(`adb uninstall ${packageName}`);
  }

  public async isInstalled(packageName: string): Promise<boolean> {
    const {stdout} = await this.shell(`cmd package list packages ${packageName}`);
    return stdout.includes(packageName);
  }

  private async keyevent(key: number) {
    return await this.shell(`input keyevent ${key}`);
  }
}
