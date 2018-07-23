const https = require('https');
const fs = require('fs');
const path = require('path');

const assetsDirectory = path.resolve(path.join(__dirname, '../src/assets'));

https.get('https://pokeassistant.com/main/ivcalculator', response => {
  if (response.statusCode === 200) {
    let body = '';
    response.on('data', (data) => {
      body += data;
    });
    response.on('end', () => {
      const matchArray = /<span[^>]*sourcehash3[^>]*>([^<]*)/.exec(body);
      const json = JSON.parse(matchArray[1].replace(/&quot;/g, '"'));
      const filePath = path.join(assetsDirectory, 'pokeassistant/sourcehash3.json');
      fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
      console.log(`${filePath} updated!`);
    });
  } else {
    console.error('Could not DL sourcehash3');
  }
});

https.get('https://pokeassistant.com/json/pokenames.json', response => {
  if (response.statusCode === 200) {
    let body = '';
    response.on('data', (data) => {
      body += data;
    });
    response.on('end', () => {
      const json = JSON.parse(body);
      const filePath = path.join(assetsDirectory, 'pokeassistant/pokenames.json');
      fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
      console.log(`${filePath} updated!`);
    });
  } else {
    console.error('Could not DL cpm');
  }
});

https.get('https://pokemongo.gamepress.gg/sites/pokemongo/files/pogo-jsons/data.json', response => {
  if (response.statusCode === 200) {
    let body = '';
    response.on('data', (data) => {
      body += data;
    });
    response.on('end', () => {
      const json = JSON.parse(body);
      const filePath = path.join(assetsDirectory, 'gamepress/data.json');
      fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
      console.log(`${filePath} updated!`);
    });
  } else {
    console.error('Could not DL cpm');
  }
});
