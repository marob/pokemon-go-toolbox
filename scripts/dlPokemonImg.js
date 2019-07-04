const fs = require('fs');
const https = require('https');

const BASE_URL = 'https://pokemon.gameinfo.io/images/pokemon-go';
const toDir = 'src/assets/img/pokemon';
const MAX_POKEDEX_ID = 488;

const FORMS = {
  // // Zarbi
  // 201: {urlMin: 11, fsMin: 1, nb: 26},
  // Morphéo
  351: { urlMin: 11, fsIds: [351, 10013, 10014, 10015], nb: 4 },
  // Deoxys
  386: { urlMin: 11, fsIds: [386, 10001, 10002, 10003], nb: 4 },
  // Giratina
  487: { urlMin: 11, fsIds: [487, 10007], nb: 2 },
};

const ALOLA = [
  {
    pid: 10091,
    name: 'Rattata Forme d’Alola',
    locale: 'fr',
    originalName: 'Rattata',
    originalId: 19
  },
  {
    pid: 10092,
    name: 'Rattatac Forme d’Alola',
    locale: 'fr',
    originalName: 'Rattatac',
    originalId: 20
  },
  {
    pid: 10100,
    name: 'Raichu Forme d’Alola',
    locale: 'fr',
    originalName: 'Raichu',
    originalId: 26
  },
  {
    pid: 10101,
    name: 'Sabelette Forme d’Alola',
    locale: 'fr',
    originalName: 'Sabelette',
    originalId: 27
  },
  {
    pid: 10102,
    name: 'Sablaireau Forme d’Alola',
    locale: 'fr',
    originalName: 'Sablaireau',
    originalId: 28
  },
  {
    pid: 10103,
    name: 'Goupix Forme d’Alola',
    locale: 'fr',
    originalName: 'Goupix',
    originalId: 37
  },
  {
    pid: 10104,
    name: 'Feunard Forme d’Alola',
    locale: 'fr',
    originalName: 'Feunard',
    originalId: 38
  },
  {
    pid: 10105,
    name: 'Taupiqueur Forme d’Alola',
    locale: 'fr',
    originalName: 'Taupiqueur',
    originalId: 50
  },
  {
    pid: 10106,
    name: 'Triopikeur Forme d’Alola',
    locale: 'fr',
    originalName: 'Triopikeur',
    originalId: 51
  },
  {
    pid: 10107,
    name: 'Miaouss Forme d’Alola',
    locale: 'fr',
    originalName: 'Miaouss',
    originalId: 52
  },
  {
    pid: 10108,
    name: 'Persian Forme d’Alola',
    locale: 'fr',
    originalName: 'Persian',
    originalId: 53
  },
  {
    pid: 10109,
    name: 'Racaillou Forme d’Alola',
    locale: 'fr',
    originalName: 'Racaillou',
    originalId: 74
  },
  {
    pid: 10110,
    name: 'Gravalanch Forme d’Alola',
    locale: 'fr',
    originalName: 'Gravalanch',
    originalId: 75
  },
  {
    pid: 10111,
    name: 'Grolem Forme d’Alola',
    locale: 'fr',
    originalName: 'Grolem',
    originalId: 76
  },
  {
    pid: 10112,
    name: 'Tadmorv Forme d’Alola',
    locale: 'fr',
    originalName: 'Tadmorv',
    originalId: 88
  },
  {
    pid: 10113,
    name: 'Grotadmorv Forme d’Alola',
    locale: 'fr',
    originalName: 'Grotadmorv',
    originalId: 89
  },
  {
    pid: 10114,
    name: 'Noadkoko Forme d’Alola',
    locale: 'fr',
    originalName: 'Noadkoko',
    originalId: 103
  },
  {
    pid: 10115,
    name: 'Ossatueur Forme d’Alola',
    locale: 'fr',
    originalName: 'Ossatueur',
    originalId: 105
  }
];

const dl = function(img, fileName) {
  const url = `${BASE_URL}/${img}.png`;
  https.get(url, response => {
    if (response.statusCode === 200) {
      response.pipe(fs.createWriteStream(`${toDir}/${fileName}.png`));
    } else {
      console.error(`[${response.statusCode}] ${url}`);
    }
  });
};

const pad = function(value, length) {
  let pad = '';
  for (let i = 0; i < length; i++) {
    pad += '0';
  }
  return (pad + value).substring(('' + value).length);
};

for (let i = 1; i <= MAX_POKEDEX_ID; i++) {
  const id = pad(i, 3);

  let img = id;
  let fileName = id;

  const toDL = [];

  const form = FORMS[i];
  if (form) {
    for (let fi = 0; fi < form.nb; fi++) {
      const urlForm = pad(form.urlMin + fi, 2);
      const formFileName = form.fsMin ? `${fileName}-${form.fsMin + fi}` : form.fsIds[fi];
      toDL.push({
        img: `${img}-${urlForm}`,
        fileName: formFileName
      });
    }
  } else {
    toDL.push({
      img: `${img}-00`,
      fileName: fileName
    });
  }

  const alola = ALOLA.find(a => a.originalId === i);
  if (alola) {
    toDL.push({
      img: `${img}-61`,
      fileName: alola.pid
    });
  }

  toDL.forEach(d => dl(d.img, d.fileName));
}
