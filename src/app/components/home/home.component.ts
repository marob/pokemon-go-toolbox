import {Component, NgZone, OnInit} from '@angular/core';
import {Pokemon} from '../pokemon/pokemon';
import TimeUtils from '../../utils/timeUtils';
import {AdbService} from '../../providers/adb.service';
import {ClipperService} from '../../providers/clipper.service';
import {CalcyIVService} from '../../providers/calcyIV.service';
import {PogoService} from '../../providers/pogo.service';
import PokemonDetailScreen from '../../dto/screen/pokemonDetailScreen';
import {filter, map} from 'rxjs/operators';
import {Observable} from 'rxjs';
import {DevicesService} from '../../providers/devices.service';
import {ReferenceDataService} from '../../providers/reference-data.service';

interface PokemonName {
  pid: number;
  name: string;
  locale: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  public pokemons: Pokemon[] = [];
  public screenshot: string;
  public evalInProgress: boolean;
  public minIv = 90;
  public selectedPokemon: Pokemon;

  private pokemonDetailScreen: PokemonDetailScreen;
  private detectedPokemons: Observable<Pokemon>;

  private standardPokemonNames: PokemonName[];
  private specialPokemonNames: PokemonName[];
  private alola: { pid: number; name: string; locale: string; originalName: string; originalId: number }[];
  private pokedex: { [id: number]: PokemonName[] };

  constructor(private devicesService: DevicesService,
              private adbService: AdbService,
              private calcyIVService: CalcyIVService,
              private clipperService: ClipperService,
              private pogoService: PogoService,
              private referenceDataService: ReferenceDataService,
              private zone: NgZone) {
  }

  async ngOnInit() {
    const names = this.referenceDataService.getPokemonNames().filter(p => p.locale === 'fr');
    this.standardPokemonNames = names.filter(p => p.pid < 10000);
    this.specialPokemonNames = names.filter(p => p.pid >= 10000);

    this.pokedex = this.standardPokemonNames.reduce((prev, current) => {
      prev[current.pid] = [current];
      return prev;
    }, {});
    names.filter(p => p.pid >= 10000).forEach(p => {
      const pokemonName = /M\. /i.test(p.name) ? p.name.split(' ').slice(0, 2).join(' ') : p.name.split(' ')[0];
      const foundPokemon = this.standardPokemonNames.find(sp => sp.name === pokemonName);
      this.pokedex[foundPokemon.pid].push(p);
    });

    this.alola = this.specialPokemonNames
      .filter(p => /alola/i.test(p.name))
      .map(p => ({...p, originalName: p.name.split(' ')[0]}))
      .map(p => ({...p, originalId: this.standardPokemonNames.find(sp => sp.name === p.originalName).pid}));

    this.devicesService.devices
      .forEach(device => device.connected$.subscribe(status => console.log(`${device.id}: ${status}`)));

    this.detectedPokemons = this.calcyIVService.streamCalcyIvLogs()
      .pipe(
        filter(log => log.includes('Received values:')),
        map((log: string) => {
          const regexMath = /Received values: Id: ([^,]*), Nr: ([^,]*), CP: ([^,]*), Max HP: ([^,]*), Dust cost: ([^,]*), Level: ([^,]*), FastMove ([^,]*), SpecialMove ([^,]*), Gender ([^,]*)/.exec(log);
          if (regexMath) {
            const [, idString, pokedexId, cp, hp, dust, level, fastMove, specialMove, gender] = regexMath;
            const [, id, pokemonName] = /(\d*) \(([^\)]*)\)/.exec(idString);

            const pokemon = new Pokemon(this.referenceDataService);
            pokemon.formId = Number.parseInt(id);
            pokemon.name = pokemonName;
            pokemon.pokedexId = Number.parseInt(pokedexId);

            if (pokemon.pokedexId > 0) {
              const foundPokemon = this.findPokemon(pokemon.pokedexId, pokemonName);
              pokemon.pid = foundPokemon.pid;
            }

            pokemon.cp = Number.parseInt(cp);
            pokemon.hp = Number.parseInt(hp);
            pokemon.dust = Number.parseInt(dust);
            pokemon.level = Number.parseInt(level);
            pokemon.fastMove = fastMove;
            pokemon.specialMove = specialMove;
            pokemon.gender = Number.parseInt(gender);
            return pokemon;
          } else {
            console.error(`Doesn't match regexp: `, log);
          }
        })
      );
  }

  private findPokemon(pokedexId: number, pokemonName: string) {
    const pokemonForm = pokemonName
      .replace(/^[^ ]+/, '')
      .replace(/normale/i, '')
      .replace(/alternative/i, '') // For Giratina
      .trim();

    if (pokemonForm) {
      return this.pokedex[pokedexId]
        .find(p => new RegExp(pokemonForm, 'i').test(p.name));
    } else {
      return this.pokedex[pokedexId][0];
    }
  }

  private async initClipper() {
    if (!await this.clipperService.isInstalled()) {
      console.log('We need to install "Clipper" app on your device. Press any key to continue');
      await this.clipperService.install();
    }
    await this.clipperService.start();
  }

  async startPokemonsEval() {
    this.evalInProgress = true;
    await this.initClipper();

    const screen = await this.pogoService.getCurrentScreen();
    if (screen instanceof PokemonDetailScreen) {
      console.log('On the right screen. Evaluation will start!');
      this.pokemonDetailScreen = screen;

      const subscription = this.detectedPokemons
        .subscribe(async p => {
          if (p.isCorrectlyDetected) {
            this.clipperService.get().then(name => {
              this.zone.run(async () => {
                p.renamed = name;
              });
            });

            this.zone.run(async () => {
              console.log(p);
              this.pokemons.push(p);
            });

            if (p.maxIv >= this.minIv) {
              await this.adbService.tap(this.pokemonDetailScreen.renameButton.coordinates);
              await this.adbService.paste();
              await this.pogoService.hideKeyboard();
              await this.pogoService.clickOkOnRenameDialog();
              await TimeUtils.wait(600);
            }

            await this.pogoService.nextPokemon();
            await TimeUtils.wait(300);
          }
          if (this.evalInProgress) {
            await this.calcyIVService.analyzeScreen();
          } else {
            subscription.unsubscribe();
          }
        });
      await this.calcyIVService.analyzeScreen();
    } else {
      console.log('Not in the right screen');
      this.evalInProgress = false;
    }
  }

  stopPokemonsEval() {
    this.evalInProgress = false;
  }

  async takeScreenshot() {
    const image = await this.adbService.screenshot() as any;
    image.getBase64('image/png', (err, src) => {
      this.zone.run(() => {
        this.screenshot = src;
      });
    });
  }

  async test() {
    this.takeScreenshot();
    window.setTimeout(() => this.test(), 500);
  }
}
