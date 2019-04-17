import Button from '../button';
import Screen from './screen';

class PokemonDetailScreen extends Screen {
    constructor(
        public width: number,
        public height: number,
        public renameButton: Button,
        public actionsButton: Button,
    ) {
        super();
    }
}

export default PokemonDetailScreen;
