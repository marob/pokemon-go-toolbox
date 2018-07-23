import * as path from 'path';
import * as fs from 'fs';

const node = {
  path: window.require('path') as typeof path,
  fs: window.require('fs') as typeof fs
};

// JSON data from https://pokeassistant.com/json/pokenames.json
const filePath = node.path.resolve('src/assets/pokeassistant/pokenames.json');
const fileContent = node.fs.readFileSync(filePath, {encoding: 'utf8'}) as string;
export const pokemonNames: { pid: number, name: string, locale: string }[] = JSON.parse(fileContent);
