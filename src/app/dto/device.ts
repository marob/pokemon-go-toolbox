import {Subject} from 'rxjs';

export class Device {
  id: string;
  connected$: Subject<boolean>;
}
