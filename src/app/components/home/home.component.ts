import { Component, NgZone, OnInit } from '@angular/core';
import { Pokemon } from '../pokemon/pokemon';
import TimeUtils from '../../utils/timeUtils';
import { AdbService } from '../../providers/adb.service';
import { ClipperService } from '../../providers/clipper.service';
import { CalcyIVService } from '../../providers/calcyIV.service';
import { PogoService } from '../../providers/pogo.service';
import PokemonDetailScreen from '../../dto/screen/pokemonDetailScreen';
import { map, filter } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { DevicesService } from '../../providers/devices.service';
import { ReferenceDataService } from '../../providers/reference-data.service';
import { Appraisal } from '../pokemon/appraisal';

interface PokemonName {
  pid: number;
  name: string;
  locale: string;
}

class ScreenType {
  type: 'monster' | 'appraisal' | 'scrolled monster';
  lucky?: boolean;
}

const SCREEN_REGEXP = new RegExp('Detected (.*) screen');
const RECEIVED_VALUES_REGEXP = new RegExp('Received values: (.*)');

const APPRAISAL_OVERALL_REGEXP = new RegExp('Overall \\(Index .*, value (.*)\\).*');
const APPRAISAL_BEST_STAT_REGEXP = new RegExp('Best stat \\(Index .*, value: (.*)\\).*');
const APPRAISAL_STATS_REGEXP = new RegExp('Stats \\(Index .*, value (.*)\\).*');

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  public pokemons: Pokemon[] = [];
  public screenshot: string;
  public evalInProgress: boolean;
  private moveScanInProgress = false;
  private appraisalInProgress: boolean;
  private endPokemonAppraisal: () => void;
  public minIv = 90;
  public appraise = true;
  public canRename = true;
  public rename = true;
  public scanMoves = true;
  public selectedPokemon: Pokemon;

  private pokemonDetailScreen: PokemonDetailScreen;
  private appraisalClickZone: [number, number];
  private calcyLogEvents: Observable<Pokemon | ScreenType | Appraisal>;

  private standardPokemonNames: PokemonName[];
  private specialPokemonNames: PokemonName[];
  private alola: { pid: number; name: string; locale: string; originalName: string; originalId: number }[];
  private pokedex: { [id: number]: PokemonName[] };

  constructor(
    private devicesService: DevicesService,
    private adbService: AdbService,
    private calcyIVService: CalcyIVService,
    private clipperService: ClipperService,
    private pogoService: PogoService,
    private referenceDataService: ReferenceDataService,
    private zone: NgZone) {
  }

  async ngOnInit() {
    this.canRename = await this.adbService.getApiLevel() >= 24;
    if (!this.canRename) {
      this.rename = false;
    }

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
      .map(p => ({ ...p, originalName: p.name.split(' ')[0] }))
      .map(p => ({ ...p, originalId: this.standardPokemonNames.find(sp => sp.name === p.originalName).pid }));

    this.devicesService.devices
      .forEach(device => device.connected$.subscribe(status => console.log(`${device.id}: ${status}`)));

    this.calcyLogEvents = this.calcyIVService.streamCalcyIvLogs()
      .pipe(
        map((log: string) => {
          const screenRegexpMatch = SCREEN_REGEXP.exec(log);
          if (screenRegexpMatch) {
            const [, screen] = screenRegexpMatch;
            console.log(`Found screen "${screen}"`);
            const screenType = new ScreenType();
            if (screen === 'lucky monster') {
              screenType.type = 'monster';
              screenType.lucky = true;
            } else if (screen === 'monster') {
              screenType.type = 'monster';
              screenType.lucky = false;
            } else if (screen === 'appraisal') {
              screenType.type = 'appraisal';
            } else if (screen === 'scrolled monster') {
              screenType.type = 'scrolled monster';
            } else {
              console.error(`Unknown screen type: ${screen}`);
            }
            return screenType;
          }

          const receivedValuesRegexMatch = RECEIVED_VALUES_REGEXP.exec(log);
          if (receivedValuesRegexMatch) {
            const receivedValues: any = receivedValuesRegexMatch[1].split(',').map(v => v.trim()).reduce((acc, receivedValue) => {
              let [key, value] = receivedValue.split(':').map(v => v.trim());
              if (!value) {
                [key, value] = key.split(' ');
              }
              acc[key.replace(/[- ]/g, '')] = value;
              return acc;
            }, {});

            const [, id, pokemonName] = /(\d*) \(([^\)]*)\)/.exec(receivedValues.Id);

            const pokemon = new Pokemon(this.referenceDataService);
            pokemon.formId = Number.parseInt(id, 10);
            pokemon.name = pokemonName;
            pokemon.pokedexId = Number.parseInt(receivedValues.Nr, 10);

            if (pokemon.pokedexId > 0) {
              const foundPokemon = this.findPokemon(pokemon.pokedexId, pokemonName);
              pokemon.pid = foundPokemon.pid;
            }

            pokemon.cp = Number.parseInt(receivedValues.CP, 10);
            pokemon.hp = Number.parseInt(receivedValues.MaxHP, 10);
            pokemon.dust = Number.parseInt(receivedValues.Dustcost, 10);
            pokemon.level = Number.parseInt(receivedValues.Level, 10);
            pokemon.fastMove = receivedValues.FastMove;
            pokemon.specialMove = receivedValues.SpecialMove;
            pokemon.specialMove2 = receivedValues.SpecialMove2;
            pokemon.gender = Number.parseInt(receivedValues.Gender, 10);
            pokemon.catchYear = Number.parseInt(receivedValues.CatchYear, 10);
            pokemon.favorite = Number.parseInt(receivedValues.Favorite, 10) === 1;
            pokemon.levelUp = receivedValues.Levelup.toLowerCase() === 'true';
            return pokemon;
          }

          const appraisalOverallRegexMatch = APPRAISAL_OVERALL_REGEXP.exec(log);
          if (appraisalOverallRegexMatch) {
            const appraisal = new Appraisal();
            appraisal.overall = Number.parseInt(appraisalOverallRegexMatch[1], 10);
            return appraisal;
          }

          const appraisalBestStatRegexMatch = APPRAISAL_BEST_STAT_REGEXP.exec(log);
          if (appraisalBestStatRegexMatch) {
            const appraisal = new Appraisal();
            appraisal.bestStat = Number.parseInt(appraisalBestStatRegexMatch[1], 10);
            return appraisal;
          }

          const appraisalStatsRegexMatch = APPRAISAL_STATS_REGEXP.exec(log);
          if (appraisalStatsRegexMatch) {
            const appraisal = new Appraisal();
            appraisal.stats = Number.parseInt(appraisalStatsRegexMatch[1], 10);
            return appraisal;
          }
        }),
        filter(event => event !== undefined)
      );
  }

  private findPokemon(pokedexId: number, pokemonName: string) {
    const pokemonsFromPokedexId = this.pokedex[pokedexId];

    if (pokemonsFromPokedexId.length === 0) {
      console.error('Pokemon not found:', pokedexId, this.pokedex);
    } else if (pokemonsFromPokedexId.length === 1) {
      return pokemonsFromPokedexId[0];
    } else {
      const pokemonForm = pokemonName.split(' ').slice(1).join(' ');
      let foundPokemon = pokemonsFromPokedexId.find(p => new RegExp(pokemonForm, 'i').test(p.name));
      if (!foundPokemon) {
        console.warn('Pokemon not found:', pokedexId, pokemonName, pokemonsFromPokedexId);
        foundPokemon = pokemonsFromPokedexId[0];
        console.warn('Defaulting to', foundPokemon);
      }
      return foundPokemon;
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
    this.appraisalInProgress = false;
    await this.initClipper();

    const screen = await this.pogoService.getCurrentScreen();
    if (screen instanceof PokemonDetailScreen) {
      console.log('On the right screen. Evaluation will start!');
      this.pokemonDetailScreen = screen;
      this.appraisalClickZone = [1, this.pokemonDetailScreen.actionsButton.coordinates[1]];

      let lucky;
      let currentAppraisal: Appraisal;

      const subscription = this.calcyLogEvents
        .subscribe(async event => {
          if (event instanceof ScreenType) {
            if (event.type === 'monster') {
              lucky = event.lucky;
            }
            const falseAppraisalScreen = event.type === 'appraisal' && !this.appraisalInProgress;
            if (falseAppraisalScreen) {
              if (this.evalInProgress) {
                await this.calcyIVService.analyzeScreen();
              } else {
                subscription.unsubscribe();
              }
            }
          }

          if (event instanceof Appraisal) {
            if (event.overall && !currentAppraisal) {
              currentAppraisal = new Appraisal();
              currentAppraisal.overall = event.overall;
              console.log(`Appraisal (in progress): ${JSON.stringify(currentAppraisal)}`);
              this.adbService.tap(this.appraisalClickZone);
            }
            if (event.bestStat >= 0 && !currentAppraisal.bestStats.includes(event.bestStat)) {
              currentAppraisal.bestStats.push(event.bestStat);
              console.log(`Appraisal (in progress): ${JSON.stringify(currentAppraisal)}`);
              this.adbService.tap(this.appraisalClickZone);
            }
            if (event.stats) {
              currentAppraisal.stats = event.stats;
              console.log(`Appraisal: ${JSON.stringify(currentAppraisal)}`);

              const appraisalScreen = await this.pogoService.getAppraisalScreen(this.pokemonDetailScreen.actionsButton.coordinates);
              console.log('Save appraisal result');
              await this.adbService.tap(appraisalScreen.saveButton.coordinates);

              console.log('Clicks to dismiss appraisal end text');
              await this.adbService.tap(this.appraisalClickZone);
              await this.adbService.tap(this.appraisalClickZone);
              await this.adbService.tap(this.appraisalClickZone);

              console.log('Dismiss result screen after appraisal');
              await this.adbService.tap([
                Math.round(this.pokemonDetailScreen.width / 2),
                Math.round(this.pokemonDetailScreen.height / 2)
              ]);

              this.endPokemonAppraisal();
            }
          }

          if (event instanceof Pokemon) {
            const pokemon = event;
            pokemon.lucky = lucky;
            if (pokemon.isCorrectlyDetected) {
              this.zone.run(async () => {
                console.log(pokemon);
                this.pokemons.push(pokemon);
              });

              if (this.appraise && pokemon.possibleIVs.length > 1 && pokemon.maxIv >= this.minIv) {
                currentAppraisal = null;
                await this.appraisePokemon();
                this.zone.run(async () => {
                  pokemon.appraisal = currentAppraisal;
                });
              }

              this.clipperService.get().then(name => {
                this.zone.run(async () => {
                  this.zone.run(async () => {
                    pokemon.renamed = name;
                  });
                });
              });

              if (this.rename && pokemon.maxIv >= this.minIv) {
                if (this.scanMoves) {
                  this.moveScanInProgress = true;
                  const middleHeight = Math.round(this.pokemonDetailScreen.height / 2);
                  const scrollHeight = Math.round(this.pokemonDetailScreen.height / 8);
                  await this.adbService.swipe(
                    [1, middleHeight + scrollHeight],
                    [1, middleHeight]
                  );
                  await this.calcyIVService.analyzeScreen();
                  await this.adbService.swipe(
                    [1, middleHeight],
                    [1, middleHeight + 2 * scrollHeight]
                  );
                  this.moveScanInProgress = false;
                }

                await this.adbService.tap(this.pokemonDetailScreen.renameButton.coordinates);
                await this.adbService.paste();
                await this.pogoService.hideKeyboard();
                await this.pogoService.clickOkOnRenameDialog();
                await TimeUtils.wait(600);
              }

              await this.pogoService.nextPokemon();
              await TimeUtils.wait(300);
            }
            if (this.evalInProgress && !this.moveScanInProgress) {
              await this.calcyIVService.analyzeScreen();
            } else {
              subscription.unsubscribe();
            }
          }
        });
      await this.calcyIVService.analyzeScreen();
    } else {
      console.log('Not in the right screen');
      this.evalInProgress = false;
    }
  }

  private async appraisePokemon() {
    return new Promise(async (resolve) => {
      console.log('Enter appraisal mode');
      this.appraisalInProgress = true;
      console.log('Click actions button');
      await this.adbService.tap(this.pokemonDetailScreen.actionsButton.coordinates);
      const actionsButtonsScreen = await this.pogoService.getActionsButtonsScreen(this.pokemonDetailScreen.actionsButton.coordinates);
      console.log('Click appraise button in actions button');
      await this.adbService.tap(actionsButtonsScreen.appraiseButton.coordinates);
      this.adbService.tap(this.appraisalClickZone);
      await this.calcyIVService.analyzeScreen();

      this.endPokemonAppraisal = () => {
        this.appraisalInProgress = false;
        resolve();
      };
    });
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
