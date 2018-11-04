import {Component, OnInit} from '@angular/core';
import {AdbService} from '../../providers/adb.service';
import {ReferenceDataService} from '../../providers/reference-data.service';

@Component({
  selector: 'app-init',
  templateUrl: './init.component.html',
  styleUrls: ['./init.component.scss']
})
export class InitComponent implements OnInit {
  public ready = false;

  constructor(private adbService: AdbService,
              private referenceDataService: ReferenceDataService) {
  }

  async ngOnInit() {
    if (!this.adbService.isInstalled()) {
      await this.adbService.install();
    }
    await this.adbService.startServer();

    await this.referenceDataService.update();

    this.ready = true;
  }

}
