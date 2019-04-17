export class Iv {
  constructor(public hp: number, public atk: number, public def: number) {
  }

  get sum() {
    return this.hp + this.atk + this.def;
  }

  get max() {
    return Math.max(this.hp, this.atk, this.def);
  }

  get iv() {
    return Math.round(this.sum * 100 / 45);
  }
}
