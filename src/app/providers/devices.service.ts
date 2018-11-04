import {Injectable} from '@angular/core';
import {Device} from '../dto/device';

@Injectable({
  providedIn: 'root'
})
export class DevicesService {
  devices: Device[] = [];

  constructor() {
  }
}
