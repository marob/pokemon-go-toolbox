import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {Pokemon} from '../pokemon/pokemon';
import {MatSort, MatTableDataSource} from '@angular/material';

@Component({
  selector: 'app-pokemon-detail',
  templateUrl: './pokemon-detail.component.html',
  styleUrls: ['./pokemon-detail.component.scss']
})
export class PokemonDetailComponent implements OnInit {
  private _pokemon: Pokemon;

  @ViewChild(MatSort) sort: MatSort;

  @Input()
  set pokemon(p: Pokemon) {
    this._pokemon = p;
    this.dataSource.sort = this.sort;
    if (p) {
      this.dataSource.data = p.possibleIVs.sort((a, b) => b.iv - a.iv);
    }
  }

  displayedColumns: string[] = ['atk', 'def', 'hp', 'iv'];
  dataSource = new MatTableDataSource();

  ngOnInit(): void {
  }

}
