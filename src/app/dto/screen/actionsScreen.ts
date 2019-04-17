import Button from '../button';
import Screen from './screen';

class ActionsScreen extends Screen {
    constructor(public transferButton: Button,
                public appraiseButton: Button,
                public favoriteButton: Button,
                public objectsButton: Button
                ) {
        super();
    }
}

export default ActionsScreen;
