export class Iv {
  constructor(public hp: number, public atk: number, public def: number) {
  }

  get iv() {
    return Math.round((this.hp + this.atk + this.def) * 100 / 45);
  }
}
