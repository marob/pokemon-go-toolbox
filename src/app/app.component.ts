import {Component} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {AppConfig} from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(private translate: TranslateService) {

    translate.setDefaultLang('en');
    console.log('AppConfig', AppConfig);

    if (window && window.process && window.process.type) {
      console.log('Mode electron');
      console.log('Electron ipcRenderer', window.require('electron').ipcRenderer);
      console.log('NodeJS childProcess', window.require('child_process'));
    } else {
      console.log('Mode web');
    }
  }
}
