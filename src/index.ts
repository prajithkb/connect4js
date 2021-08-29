import { UI } from './ui';
import { Connect4, GameEvent } from './game';
import './game.css';
require("jquery-ui/themes/base/all.css");
declare global {
    interface Window {
        levelId: any;
    }
}
const inputs = {
    levelId: window.levelId
};
const game = new Connect4("Name", 6, 7);
new UI(inputs, game);

