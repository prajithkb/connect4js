import { Engine } from './engine';
import { Connect4, GameEvent } from './game';
import './game.css';

declare global {
    interface Window {
        levelId: any;
    }
}
function component() {
    const element = document.createElement('div');
    const game = new Connect4("Name", 6, 7);
    const inputs = {
        levelId: window.levelId
    };
    const engine = new Engine(inputs, game);
    setInterval(() => {
        let player = Math.random() < .5 ? 1 : 0;
        game.autoMove(player);
    }, 3000);
    return element;
}

document.body.appendChild(component());
