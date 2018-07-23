import * as path from 'path';
import * as fs from 'fs';

const node = {
  path: window.require('path') as typeof path,
  fs: window.require('fs') as typeof fs
};

// Data coming from https://pokemongo.gamepress.gg/sites/pokemongo/files/pogo-jsons/data.json
const filePath = node.path.resolve('src/assets/gamepress/data.json');
const fileContent = node.fs.readFileSync(filePath, {encoding: 'utf8'}) as string;
export const cpm: number[] = JSON.parse(fileContent).cpm;
