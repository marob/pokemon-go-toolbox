import {Injectable} from '@angular/core';
import {AdbService} from './adb.service';
import * as path from 'path';
import {IncomingMessage} from 'http';
import * as https from 'https';
import * as fs from 'fs';

const PACKAGE_NAME = 'ca.zgrs.clipper';

const node = {
  path: window.require('path') as typeof path,
  https: window.require('follow-redirects').https as typeof https,
  fs: window.require('fs') as typeof fs
};

@Injectable({
  providedIn: 'root'
})
export class ClipperService {
  private apkPath: string;

  constructor(private adbService: AdbService) {
    this.apkPath = node.path.resolve('clipper.apk');
  }

  private async download() {
    return new Promise((resolve) => {
      node.https.get(`https://github.com/majido/clipper/releases/download/v1.2.1/clipper.apk`,
        (res: IncomingMessage) => {
          res
            .pipe(node.fs.createWriteStream(this.apkPath))
            .on('close', () => {
              resolve();
            });
        }
      );
    });
  }

  public async install() {
    await this.download();
    console.log(`Installing ${this.apkPath} to device...`);
    const result = await this.adbService.installApp(this.apkPath);
    console.log(`${this.apkPath} installed!`);
    return result;
  }

  public async uninstall() {
    return await this.adbService.uninstallApp(PACKAGE_NAME);
  }

  public async isInstalled(): Promise<boolean> {
    return await this.adbService.appIsInstalled(PACKAGE_NAME);
  }

  public async start() {
    return await this.adbService.shell(`am startservice ${PACKAGE_NAME}/.ClipboardService`);
  }

  public async get(): Promise<string> {
    const {stdout} = await this.adbService.shell('am broadcast -a clipper.get');
    const array = /data="(.*)"/.exec(stdout);
    return array ? array[1] : null;
  }

  public async set(value: string) {
    const escapedValue = value.replace('&', '\\\&');
    return await this.adbService.shell(`am broadcast -a clipper.set -e text '${escapedValue}'`);
  }

}
