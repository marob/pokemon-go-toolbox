import {Injectable} from '@angular/core';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';

const node = {
  path: window.require('path') as typeof path,
  fs: window.require('fs') as typeof fs,
  https: window.require('https') as typeof https
};

const USER_DATA_PATH = window.require('electron').remote.app.getPath('userData');
const REFERENCE_DATA_PATH = node.path.resolve(
  node.path.join(
    USER_DATA_PATH,
    'referenceData'
  )
);

const POKEASSISTANT_FOLDER_PATH = node.path.join(REFERENCE_DATA_PATH, 'pokeassistant');
const GAMEPRESS_FOLDER_PATH = node.path.join(REFERENCE_DATA_PATH, 'gamepress');
const SOURCEHASH3_FILE_PATH = node.path.join(POKEASSISTANT_FOLDER_PATH, 'sourcehash3.json');
const POKENAMES_FILE_PATH = node.path.join(POKEASSISTANT_FOLDER_PATH, 'pokenames.json');
const CPM_FILE_PATH = node.path.join(GAMEPRESS_FOLDER_PATH, 'data.json');

// FIXME: how about storing data in local storage instead of file system?


@Injectable({
  providedIn: 'root'
})
export class ReferenceDataService {
  getCPM(): number[] {
    const fileContent = node.fs.readFileSync(CPM_FILE_PATH, {encoding: 'utf8'}) as string;
    return JSON.parse(fileContent).cpm;
  }

  getPokemonData(): { [x: string]: {id: number, stamina: number, attack: number, defense: number} } {
    const fileContent = node.fs.readFileSync(SOURCEHASH3_FILE_PATH, {encoding: 'utf8'}) as string;
    return JSON.parse(fileContent);
  }

  getPokemonNames(): { pid: number, name: string, locale: string }[] {
    const fileContent = node.fs.readFileSync(POKENAMES_FILE_PATH, {encoding: 'utf8'}) as string;
    return JSON.parse(fileContent);
  }

  update(): Promise<any> {
    if (!node.fs.existsSync(REFERENCE_DATA_PATH)) {
      node.fs.mkdirSync(REFERENCE_DATA_PATH);
    }
    if (!node.fs.existsSync(POKEASSISTANT_FOLDER_PATH)) {
      node.fs.mkdirSync(POKEASSISTANT_FOLDER_PATH);
    }
    if (!node.fs.existsSync(GAMEPRESS_FOLDER_PATH)) {
      node.fs.mkdirSync(GAMEPRESS_FOLDER_PATH);
    }

    const promises = [
      this.updatePokemonData(),
      this.updatePokemonNames(),
      this.updateCPM()
    ];
    return Promise.all(promises);
  }

  private updatePokemonData(): PromiseLike<string> | string {
    return new Promise<string>((resolve, reject) => {
      node.https.get('https://pokeassistant.com/main/ivcalculator', response => {
        if (response.statusCode === 200) {
          let body = '';
          response.on('data', (data) => {
            body += data;
          });
          response.on('end', () => {
            const matchArray = /<span[^>]*sourcehash3[^>]*>([^<]*)/.exec(body);
            const json = JSON.parse(matchArray[1].replace(/&quot;/g, '"'));
            node.fs.writeFileSync(SOURCEHASH3_FILE_PATH, JSON.stringify(json, null, 2));
            console.log(`${SOURCEHASH3_FILE_PATH} updated!`);
            resolve('pokemonData');
          });
        } else {
          console.error('Could not DL sourcehash3');
          reject();
        }
      });
    });
  }

  private updatePokemonNames() {
    return new Promise((resolve, reject) => {
      node.https.get('https://pokeassistant.com/json/pokenames.json', response => {
        if (response.statusCode === 200) {
          let body = '';
          response.on('data', (data) => {
            body += data;
          });
          response.on('end', () => {
            const json = JSON.parse(body);
            node.fs.writeFileSync(POKENAMES_FILE_PATH, JSON.stringify(json, null, 2));
            console.log(`${POKENAMES_FILE_PATH} updated!`);
            resolve('pokemonNames');
          });
        } else {
          console.error('Could not DL cpm');
          reject();
        }
      });
    });
  }

  private updateCPM() {
    return new Promise((resolve, reject) => {

      node.https.get('https://pokemongo.gamepress.gg/sites/pokemongo/files/pogo-jsons/data.json', response => {
        if (response.statusCode === 200) {
          let body = '';
          response.on('data', (data) => {
            body += data;
          });
          response.on('end', () => {
            const json = JSON.parse(body);
            node.fs.writeFileSync(CPM_FILE_PATH, JSON.stringify(json, null, 2));
            console.log(`${CPM_FILE_PATH} updated!`);
            resolve('cpm');
          });
        } else {
          console.error('Could not DL cpm');
          reject();
        }
      });
    });
  }
}
