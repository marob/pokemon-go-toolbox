import * as path from 'path';
import * as fs from 'fs';

const node = {
  path: window.require('path') as typeof path,
  fs: window.require('fs') as typeof fs
};

// Data coming from https://pokeassistant.com/main/ivcalculator in span#sourcehash3
const filePath = node.path.resolve('src/assets/pokeassistant/sourcehash3.json');
const fileContent = node.fs.readFileSync(filePath, {encoding: 'utf8'}) as string;
export const pokemonData: { [x: string]: {id: number, stamina: number, attack: number, defense: number} } = JSON.parse(fileContent);
