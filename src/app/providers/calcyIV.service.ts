import Button from '../dto/button';
import DumpSysWindow from '../dto/dumpSysWindow';
import OutputStatus from '../dto/outputStatus';
import {Injectable} from '@angular/core';
import {AdbService} from './adb.service';
import {ClipperService} from './clipper.service';
import * as childProcess from 'child_process';
import {ChildProcess} from 'child_process';
import {Observable} from 'rxjs';

const node = {
  childProcess: window.require('child_process') as typeof childProcess
};

@Injectable({
  providedIn: 'root'
})
export class CalcyIVService {
  private APP_NAME = 'tesmath.calcy';

  // private logsSubject = new Subject<String>();
  // public logs$ = this.logsSubject.asObservable();

  constructor(private adbService: AdbService,
              private clipperService: ClipperService) {
    // this.streamCalcyIvLogs();
  }

  public streamCalcyIvLogs(): Observable<String> {
    return new Observable(subscriber => {
      const childPromise = new Promise(resolve => {
        // this.adbService.shell(`for p in /proc/[0-9]*; do [[ $(<$p/cmdline) = ${this.APP_NAME} ]] && echo \${p##*/}; done`)
        this.adbService.shell(`pidof -s ${this.APP_NAME}`)
          .then((result) => {
            const {stdout, stderr} = result;
            if (stderr) {
              console.error(stderr);
            }
            const calcyIvPid = Number.parseInt(stdout);
            console.log(`CalcyIV pid: ${calcyIvPid}`);
            const child = node.childProcess.spawn(process.platform === 'linux' ? './adb' : 'adb', ['logcat', '-vraw', '-T1', `--pid=${calcyIvPid}`], {
              cwd: this.adbService.platformToolsPath,
              detached: true,
              stdio: [
                0, // Use parent's stdin for child
                'pipe', // Pipe child's stdout to parent
                0
              ]
            });
            child.unref(); // and unref() somehow disentangles the child's event loop from the parent's:

            resolve(child);

            child.stdout.on('data', (data) => {
              data.toString()
                .split('\n')
                .forEach((line) => {
                  subscriber.next(line);
                  // this.logsSubject.next(line);
                });
            });
            child.stdout.on('close', (data) => {
              console.log('close');
            });
            child.stdout.on('end', (data) => {
              console.log('end');
            });
          });
      });

      return () => {
        childPromise.then((child: ChildProcess) => {
          child.kill();
        });
      };
    });
  }

  public async startIfNotRunning() {
    let started = false;
    let startInProgress = false;
    let manualStartTimeout = null;
    do {
      try {
        await this.findButton();
        started = true;
        clearTimeout(manualStartTimeout);
        console.log('CalcyIV started!');
      } catch {
        if (!startInProgress) {
          startInProgress = true;
          console.log('CalcyIV is not running: starting CalcyIV...');
          manualStartTimeout = setTimeout(() => {
            console.log('Please, click on the "start" and "switch to game" buttons ' +
              'if you haven\'t enabled auto-start');
          }, 5000);
          await this.adbService.startApp(this.APP_NAME);
        }
      }
    } while (!started);
  }

  public async findButton(): Promise<Button> {
    const windows = (await this.calcyIVWindows())
      // There are several CalcyIV windows:
      // - the CalcyIV button is "square"
      // - it is bigger than the red dot when scanning
        .filter((w) => w.width === w.height && w.width > 30)
    ;

    if (windows.length === 1) {
      const window = windows[0];
      return new Button(window.center);
    } else {
      throw new Error(`Couldn't find CalcyIV button: ${windows}`);
    }
  }

  // async isRedDotDisplayed() {
  //     return (await this.calcyIVWindows())
  //         .filter(w => w.displayed)
  //         .filter(w => w.width === w.height && w.width <= 30)
  //         .length === 1
  //         ;
  // }

  public async outputStatus(): Promise<OutputStatus> {
    const start = Date.now();
    const screenWidth = (await this.adbService.screenSize()).width;
    const scanTimeout = 1500;
    while (Date.now() - start < scanTimeout) {
      const windowsPromise = this.calcyIVWindows();
      const clipboardPromise = this.clipperService.get();

      const windows = await windowsPromise;
      const displayedWindows = windows.filter((w) => w.displayed);

      const hasRedDot = displayedWindows.filter((w) => w.width === w.height && w.width <= 30).length === 1;
      const hasCalcyIvButton = displayedWindows.filter((w) => w.width === w.height && w.width > 30).length === 1;
      const notTooWideOverlays = displayedWindows.filter(
        (w) => w.width !== w.height && w.width / screenWidth < 0.8
      );
      const hasIvOverlay = notTooWideOverlays.length === 1;

      if (displayedWindows.length === 3
        && hasRedDot
        && hasCalcyIvButton
        && hasIvOverlay
      ) {
        const clipboard = await clipboardPromise;
        if (clipboard.length > 0) {
          this.clipperService.set('');
          const ivOverlay = notTooWideOverlays[0];
          return new OutputStatus(true, clipboard, ivOverlay.center);
        }
      }
      if (displayedWindows.length > 3) {
        return new OutputStatus(false);
      }
    }
    console.log('Timeout');
    return new OutputStatus(false);
  }

  // async outputStatus(): Promise<OutputStatus> {
  //     const start = Date.now();
  //     while (!await this.isRedDotDisplayed() && Date.now() - start < 2000) {
  //     }
  //     await TimeUtils.wait(100);
  //     // Color (grey-blue) of the CalcyIV overlay border
  //     const overlayBorderColor = 0x44696cff;
  //     // Color (grey) of the CalcyIV error overlay
  //     const errorOverlayColor = 0x848484ff;
  //     const image = await adb.screenshot();

  //     // Threshold over which the number of matching pixels in one line is considered as the CalcyIV overlay bottom border
  //     const nbMatchingPixelsThreshold = 0.50 * image.bitmap.width;

  //     const y = await ImageUtils.findLineWithEnoughPixelsOfColor(image, overlayBorderColor, nbMatchingPixelsThreshold);
  //     if (y != null) {
  //         // FIXME: return y as well?
  //         return new OutputStatus([Math.round(image.bitmap.width) / 2, y], true, image);
  //     }

  //     if (await ImageUtils.findLineWithEnoughPixelsOfColor(image, errorOverlayColor, nbMatchingPixelsThreshold) != null) {
  //         return new OutputStatus(null, false, image);
  //     }
  //     return new OutputStatus(null, false, image);
  // }

  private async calcyIVWindows(): Promise<DumpSysWindow[]> {
    const exprToMatch = ['Window #', 'mHasSurface', 'mFrame='];
    const {stdout} = await this.adbService.shell([
      'dumpsys window windows',
      ` | grep -E '${exprToMatch.join('|')}'`,
      ` | grep '${this.APP_NAME}}' -A2`,
    ].join(''));

    return stdout
      .trim()
      .split('\n')
      .reduce((acc, line, i) => {
        if (i % exprToMatch.length === 0) {
          const match = /\{([^ ]+)/.exec(line);
          if (match) {
            const windowId = match[1];
            acc.push(new DumpSysWindow(windowId));
          } else {
            console.error('Couldn\'t find window id:', line);
          }
        }
        const o = acc[Math.floor(i / exprToMatch.length)];
        if (i % exprToMatch.length === 1) {
          const match = /mHasSurface=(true|false)/.exec(line);
          if (match) {
            o.displayed = JSON.parse(match[1]);
          } else {
            console.error('Couldn\'t find mHasSurface:', line);
          }
        }
        if (i % exprToMatch.length === 2) {
          const match = /mFrame=\[([0-9]+),([0-9]+)\]\[([0-9]+),([0-9]+)\]/.exec(line);
          if (match) {
            o.left = Number.parseInt(match[1]);
            o.top = Number.parseInt(match[2]);
            o.right = Number.parseInt(match[3]);
            o.bottom = Number.parseInt(match[4]);
          } else {
            console.error('Couldn\'t find mFrame:', line);
          }
        }
        return acc;
      }, [])
      ;
  }

  async analyzeScreen() {
    console.log(`Analyze screen with CalcyIV`);
    await this.adbService.shell(
      `am broadcast -a ${this.APP_NAME}.ACTION_ANALYZE_SCREEN -n ${this.APP_NAME}/.IntentReceiver --ez silentMode true`
    );
  }
}
