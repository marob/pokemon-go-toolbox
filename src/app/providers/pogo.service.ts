import Button from '../dto/button';
import HomeScreen from '../dto/screen/homeScreen';
import NavigationScreen from '../dto/screen/navigationScreen';
import PokemonDetailScreen from '../dto/screen/pokemonDetailScreen';
import PokemonListScreen from '../dto/screen/pokemonListScreen';
import Screen from '../dto/screen/screen';
import UnknownScreen from '../dto/screen/unknownScreen';
import ColorUtils from '../utils/colorUtils';
import ImageUtils from '../utils/imageUtils';
import { Injectable } from '@angular/core';
import { AdbService } from './adb.service';
import ActionsButtonsScreen from '../dto/screen/actionsScreen';
import AppraisalScreen from '../dto/screen/appraisalScreen';
import TimeUtils from '../utils/timeUtils';
import * as Jimp from 'jimp';

@Injectable({
  providedIn: 'root'
})
export class PogoService {
  constructor(private adbService: AdbService) { }

  private actionsButtonsScreen: ActionsButtonsScreen;
  private appraisalScreen: AppraisalScreen;

  public async getCurrentScreen(): Promise<Screen> {
    const image = await this.adbService.screenshot();
    return (
      this.getHomeScreen(image) ||
      this.getNavigationButtonsScreen(image) ||
      this.getPokemonListScreen(image) ||
      this.getPokemonDetailScreen(image) ||
      new UnknownScreen()
    );
  }

  public async hideKeyboard() {
    const screenSize = await this.adbService.screenSize();
    return await this.adbService.tap([
      Math.round(0.5 * screenSize.width),
      Math.round(0.1 * screenSize.height)
    ]);
  }

  public async clickOkOnRenameDialog() {
    const screenSize = await this.adbService.screenSize();
    return await this.adbService.tap([
      Math.round(0.5 * screenSize.width),
      Math.round(0.5135 * screenSize.height)
    ]);
  }

  public async nextPokemon() {
    const screenSize = await this.adbService.screenSize();
    return await this.adbService.tap([
      Math.round(0.9 * screenSize.width),
      Math.round(0.25 * screenSize.height)
    ]);
  }

  private getHomeScreen(image: Jimp): HomeScreen {
    const { width, height } = image.bitmap;

    const grey = 0xb9b9b9ff;
    const white = 0xffffffff;
    const red = 0xff3945ff;
    const mainButtonColors = [white, grey, red];

    // const darkGreen = 0x1c8796ff;
    // const darkGreenButtonColors = [
    //     darkGreen,
    //     { h: { min: 160, max: 170 } },
    //     darkGreen
    // ];
    // const lightGreenButtonColors = [
    //     { l: { min: 54, max: 60 } },
    //     { l: { min: 92, max: 98 } },
    //     { l: { min: 49, max: 55 } },
    // ];

    const c = Math.round(width / 2);
    const heightMin = Math.round(0.8 * height);
    let mainButtonL;
    for (let l = height - 1; l > heightMin; l--) {
      const pixelColor = image.getPixelColor(c, l);

      if (ColorUtils.matches(mainButtonColors[0], pixelColor)) {
        mainButtonColors.shift();
        if (ColorUtils.matches(grey, pixelColor)) {
          mainButtonL = l;
        }
        if (mainButtonColors.length === 0) {
          const homeScreen = new HomeScreen(new Button([c, mainButtonL]));
          console.log(`Home screen: ${JSON.stringify(homeScreen)}`);
          return homeScreen;
        }
      }

      // if (ColorUtils.matches(darkGreenButtonColors[0], pixelColor)) {
      //     darkGreenButtonColors.shift();
      //     if (darkGreenButtonColors.length === 0) {
      //         return new Button([c, l], 'DarkGreen');
      //     }
      // }

      // if (ColorUtils.matches(lightGreenButtonColors[0], pixelColor)) {
      //     lightGreenButtonColors.shift();
      //     if (lightGreenButtonColors.length === 0) {
      //         return new Button([c, l], 'LightGreen');
      //     }
      // }
    }

    return null;
  }

  private getNavigationButtonsScreen(image: Jimp): NavigationScreen {
    const { width, height } = image.bitmap;

    const buttonColor = {
      a: { min: -8, max: -3 },
      b: { min: 3, max: 7 },
      l: { min: 97, max: 100 }
    };

    const center = Math.round(width / 2);
    const left = Math.round(0.22 * width);
    const right = Math.round((1 - 0.22) * width);

    let backButton: Button;
    let pokemonButton: Button;
    let objectButton: Button;
    let boutiqueButton: Button;
    let pokedexButton: Button;

    const heightMin = Math.round(0.3 * height);
    for (let l = height - 1; l > heightMin; l--) {
      if (!backButton) {
        if (ColorUtils.matches(buttonColor, image.getPixelColor(center, l))) {
          backButton = new Button([center, l]);
        }
      } else if (!pokemonButton || !objectButton) {
        if (!pokemonButton) {
          if (ColorUtils.matches(buttonColor, image.getPixelColor(left, l))) {
            pokemonButton = new Button([left, l]);
          }
        }
        if (!objectButton) {
          if (ColorUtils.matches(buttonColor, image.getPixelColor(right, l))) {
            objectButton = new Button([right, l]);
          }
        }
      } else if (!boutiqueButton) {
        if (ColorUtils.matches(buttonColor, image.getPixelColor(center, l))) {
          boutiqueButton = new Button([center, l]);
          l -= Math.round(0.12 * height);
        }
      } else if (!pokedexButton) {
        if (ColorUtils.matches(buttonColor, image.getPixelColor(center, l))) {
          pokedexButton = new Button([center, l]);
          break;
        }
      }
    }

    if (
      backButton != null &&
      pokemonButton != null &&
      objectButton != null &&
      boutiqueButton != null &&
      pokedexButton != null
    ) {
      const navigationScreen = new NavigationScreen(
        backButton,
        pokemonButton,
        objectButton,
        boutiqueButton,
        pokedexButton
      );
      console.log(`Navigation screen: ${JSON.stringify(navigationScreen)}`);
      return navigationScreen;
    }

    return null;
  }

  public async getActionsButtonsScreen(actionsButtonCoords: [number, number]): Promise<ActionsButtonsScreen> {
    if (!this.actionsButtonsScreen) {
      await TimeUtils.wait(1000); // Wait for white wave animation to finish

      const image = await this.adbService.screenshot();
      const { height } = image.bitmap;

      const buttonColor = {
        v: { min: 80, max: 100 }
      };

      const c = actionsButtonCoords[0];
      const heightMax = actionsButtonCoords[1];

      const heightJump = Math.round(0.05 * height);

      let transferButton: Button;
      let appraiseButton: Button;
      let favoriteButton: Button;
      let objectsButton: Button;

      const heightMin = Math.round(0.4 * height);
      for (let l = heightMax; l > heightMin; l--) {
        if (!transferButton) {
          if (ColorUtils.matches(buttonColor, image.getPixelColor(c, l))) {
            transferButton = new Button([c, l]);
            l -= heightJump;
          }
        } else if (!appraiseButton) {
          if (ColorUtils.matches(buttonColor, image.getPixelColor(c, l))) {
            appraiseButton = new Button([c, l]);
            l -= heightJump;
          }
        } else if (!favoriteButton) {
          if (ColorUtils.matches(buttonColor, image.getPixelColor(c, l))) {
            favoriteButton = new Button([c, l]);
            l -= heightJump;
          }
        } else if (!objectsButton) {
          if (ColorUtils.matches(buttonColor, image.getPixelColor(c, l))) {
            objectsButton = new Button([c, l]);
            break;
          }
        }
      }

      if (
        transferButton != null &&
        appraiseButton != null &&
        favoriteButton != null &&
        objectsButton != null
      ) {
        const actionsButtonsScreen = new ActionsButtonsScreen(
          transferButton,
          appraiseButton,
          favoriteButton,
          objectsButton
        );
        console.log(`Actions screen: ${JSON.stringify(actionsButtonsScreen)}`);
        this.actionsButtonsScreen = actionsButtonsScreen;
      }
    }

    return this.actionsButtonsScreen;
  }

  public async getAppraisalScreen(actionsButtonCoords: [number, number]): Promise<AppraisalScreen> {
    if (!this.appraisalScreen) {
      const image = await this.adbService.screenshot();
      const { height } = image.bitmap;

      const green = 0xcfffcfff;

      const c = actionsButtonCoords[0];
      const heightMax = actionsButtonCoords[1];
      const heightMin = Math.round(0.4 * height);

      for (let l = heightMax; l > heightMin; l--) {
        if (ColorUtils.matches(green, image.getPixelColor(c, l))) {
          const appraisalScreen = new AppraisalScreen(new Button([c, l]));
          console.log(`Appraisal screen: ${JSON.stringify(appraisalScreen)}`);
          this.appraisalScreen = appraisalScreen;
          break;
        }
      }
    }

    return this.appraisalScreen;
  }

  private getPokemonListScreen(image: Jimp): PokemonListScreen {
    const searchButtonCoords = ImageUtils.findContinuousPixelsOfColorOnLine(
      image,
      {
        l: { min: 37, max: 41 },
        a: { min: -17, max: -13 },
        b: { min: -21, max: -17 }
      },
      6,
      [0.82, 0.95, 0.1, 0.2]
    );
    const firstPokemonCoords = ImageUtils.findFirst(image, 0x44696cff, [
      0.05,
      0.35,
      0.15,
      0.3
    ]);

    if (searchButtonCoords && firstPokemonCoords) {
      const pokemonListScreen = new PokemonListScreen(
        new Button(searchButtonCoords),
        new Button(firstPokemonCoords)
      );
      console.log(`Pokemon list screen: ${JSON.stringify(pokemonListScreen)}`);
      return pokemonListScreen;
    }

    return null;
  }

  private getPokemonDetailScreen(image: Jimp): PokemonDetailScreen {
    const renameButtonCoords = ImageUtils.findContinuousPixelsOfColorOnLine(
      image,
      0xd9d9d9ff,
      4,
      [0.5, 0.9, 0.2, 0.5]
    );

    const actionsButtonCoords = ImageUtils.findContinuousPixelsOfColorOnLine(
      image,
      0x1c8796ff,
      15,
      [0.75, 0.95, 0.8, 0.95]
    );

    if (renameButtonCoords && actionsButtonCoords) {
      // Always click at the center of the screen in order not to depend on the pokemon name length
      const renameButton = new Button([
        Math.round(image.bitmap.width / 2),
        renameButtonCoords[1]
      ]);
      const actionsButton = new Button(actionsButtonCoords);
      const { width, height } = image.bitmap;
      const pokemonDetailScreen = new PokemonDetailScreen(width, height, renameButton, actionsButton);
      console.log(
        `Pokemon detail screen: ${JSON.stringify(pokemonDetailScreen)}`
      );
      return pokemonDetailScreen;
    }

    return null;
  }
}
