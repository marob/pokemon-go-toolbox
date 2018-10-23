import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Pokemon} from './pokemon';

@Component({
  selector: 'app-pokemon',
  templateUrl: './pokemon.component.html',
  styleUrls: ['./pokemon.component.scss']
})
export class PokemonComponent {
  @Input()
  pokemon: Pokemon;

  @Output()
  remove = new EventEmitter();

  @Output()
  show = new EventEmitter();

  doRemove() {
    this.remove.next();
  }

  doShow() {
    this.show.next();
  }
}
