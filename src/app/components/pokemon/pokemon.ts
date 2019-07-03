import {Iv} from './iv';
import {ReferenceDataService} from '../../providers/reference-data.service';
import {Appraisal} from './appraisal';

const IV_RANGES = {
  1: {min: 37, max: 45},
  2: {min: 30, max: 36},
  3: {min: 23, max: 29},
  4: {min: 0, max: 22}
};

const STAT_INDEX = {
  0: 'atk',
  1: 'def',
  2: 'hp'
};

const STATS_MAPPING = {
  1: {min: 15, max: 15},
  2: {min: 13, max: 14},
  3: {min: 8, max: 12},
  4: {min: 0, max: 7}
};

export class Pokemon {
  pokedexId: number;
  pid: number;
  formId: number;
  name: string;
  renamed: string;
  weight: number;
  size: number;
  cp: number;
  hp: number;
  dust: number;
  level: number;
  lucky: boolean;

  fastMove: string;
  specialMove: string;
  specialMove2: string;
  gender: number;
  catchYear: number;
  favorite: boolean;
  levelUp: boolean;
  private _possibleIVs: Iv[];
  private _appraisal: Appraisal;

  constructor(private referenceDataService: ReferenceDataService) {
  }

  get image() {
    return this.pid
      ? `assets/img/pokemon/${this.pid.toString().padStart(3, '0')}.png`
      : undefined;
  }

  get isCorrectlyDetected() {
    return this.formId !== -1
      && this.cp >= 10
      && this.hp !== -1
      && this.dust !== -1
      && this.level !== -1;
  }

  get minIv() {
    if (!this.possibleIVs) {
      this.computeIv();
    }
    return this.possibleIVs ? Math.min(...this.possibleIVs.map(iv => iv.iv)) : null;
  }

  get maxIv() {
    if (!this.possibleIVs) {
      this.computeIv();
    }
    return this.possibleIVs ? Math.max(...this.possibleIVs.map(iv => iv.iv)) : null;
  }

  get imc(): number {
    return this.weight / (this.size * this.size);
  }

  get possibleIVs(): Iv[] {
    if (!this._possibleIVs) {
      this._possibleIVs = this.computeIv();
    }
    return this._possibleIVs;
  }

  set appraisal(appraisal: Appraisal) {
    this._possibleIVs = null;
    this._appraisal = appraisal;
  }

  get appraisal(): Appraisal {
    return this._appraisal;
  }

  /**
   * Algorithm inspired from https://pokemongo.gamepress.gg/app/factories/calcData.factory.js
   */
  private computeIv(): Iv[] {
    const minATK = 0;
    const minHP = 0;
    const minDEF = 0;
    const maxATK = 15;
    const maxHP = 15;
    const maxDEF = 15;

    const ECpM = this.referenceDataService.getCPM()[this.level - 1];

    // const data = pokemonData[this.pokedexId - 1];
    const data = this.referenceDataService.getPokemonData()[this.pid];
    let possibleIVs = [];
    if (data) {
      const {stamina, attack, defense} = data;

      for (let hp = minHP; hp <= maxHP; hp++) {
        let thp = Math.floor(ECpM * (stamina + hp));
        thp = thp < 10 ? 10 : thp;
        if (thp === this.hp) {
          for (let atk = minATK; atk <= maxATK; atk++) {
            for (let def = minDEF; def <= maxDEF; def++) {
              let cp = Math.floor((attack + atk) * Math.pow(defense + def, 0.5) * Math.pow(stamina + hp, 0.5) * Math.pow(ECpM, 2) / 10);
              cp = cp < 10 ? 10 : cp;
              if (cp === this.cp) {
                const possibleIV = new Iv(hp, atk, def);
                possibleIVs.push(possibleIV);
              }
            }
          }
        }
      }
    }

    if (this.appraisal) {
      possibleIVs = possibleIVs
        .filter(iv => !this.appraisal.overall ||
           (iv.sum >= IV_RANGES[this.appraisal.overall].min && iv.sum <= IV_RANGES[this.appraisal.overall].max)
        )
        .filter(iv => !this.appraisal.bestStats.length ||
          (this.appraisal.bestStats.map(stat => iv[STAT_INDEX[stat]]).every(val => val === iv.max))
        )
        .filter(iv => !this.appraisal.stats ||
          (iv.max >= STATS_MAPPING[this.appraisal.stats].min && iv.max <= STATS_MAPPING[this.appraisal.stats].max)
        );
    }

    return possibleIVs;
  }
}
