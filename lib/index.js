'use strict';

let ComponentEngine = require('component-engine').Engine;

let engine;

document.addEventListener("DOMContentLoaded", function() {
    engine = new ComponentEngine({
        clearColor: 0x000000
    });
    engine.camera.position.z = 500;

    createGame();

    // TODO: temporary controls
    let controls = new THREE.OrbitControls(engine.camera);
    engine.on('update', function() {
        controls.update();
    });

    engine.run();
});

let Entity = require('component-engine').Entity;

function createGame() {
    let GameComponent = require('./game_component');

    let entity = new Entity(engine);
    entity.addComponent(new GameComponent(entity));

    return entity;
}
