import {Injectable} from '@angular/core';
import {Device} from '../dto/device';

@Injectable()
export class DevicesService {
  devices: Device[] = [];

  constructor() {
  }
}
