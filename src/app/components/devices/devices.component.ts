import {Component, OnInit} from '@angular/core';
import {AdbService} from '../../providers/adb.service';
import {Router} from '@angular/router';
import {DevicesService} from '../../providers/devices.service';
import {of, Subject} from 'rxjs';
import {Device} from '../../dto/device';

@Component({
  selector: 'app-devices',
  templateUrl: './devices.component.html',
  styleUrls: ['./devices.component.scss']
})
export class DevicesComponent implements OnInit {
  devices: Device[];

  constructor(private adbService: AdbService,
              private devicesService: DevicesService,
              private router: Router) {
  }

  async ngOnInit() {
    await this.refreshDevices();
    setInterval(this.refreshDevices.bind(this), 5000);

    this.devices = this.devicesService.devices;

    const nbDevices = this.devices.length;
    console.log(`#devices: ${nbDevices}`);
    if (nbDevices === 1) {
      this.router.navigateByUrl('/home');
    }
  }

  async refreshDevices() {
    const devices = await this.adbService.devices();

    this.devicesService.devices
      .forEach(device => {
        if (!devices.includes(device.id)) {
          device.connected$.next(false);
        }
      });

    const deviceConnected = new Subject<boolean>();
    deviceConnected.next(true);
    devices
      .filter(device => !this.devicesService.devices.map(d => d.id).includes(device))
      .forEach(device => this.devicesService.devices.push(
        {
          id: device,
          connected$: deviceConnected
        }
      ));
  }

}
