import { UI } from './ui';
import { Connect4 } from './game';
import './game.css';
require("jquery-ui/themes/base/all.css");
declare global {
    interface Window {
        levelId: any;
    }
}
const inputs = {
    level: window.levelId
};
const game = new Connect4("Name", 6, 7);
new UI(inputs, game);

