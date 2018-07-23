import {Injectable} from '@angular/core';
import {AdbService} from './adb.service';
import * as path from 'path';

const PACKAGE_NAME = 'ca.zgrs.clipper';

const node = {
  path: window.require('path') as typeof path
};

@Injectable()
export default class ClipperService {
  private apkPath: string;

  constructor(private adbService: AdbService
  ) {
    this.apkPath = node.path.join(__dirname, '../../resources/clipper.apk');
  }

  public async install() {
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
    return /data="(.*)"/.exec(stdout)[1];
  }

  public async set(value: string) {
    const escapedValue = value.replace('&', '\\\&');
    return await this.adbService.shell(`am broadcast -a clipper.set -e text '${escapedValue}'`);
  }

}
