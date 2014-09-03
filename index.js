'use strict';

var ComponentEngine = require('component-engine').Engine;

var engine;

document.addEventListener("DOMContentLoaded", function() {
    engine = new ComponentEngine({
        clearColor: 0x000000
    });
    engine.camera.position.z = 500;

    createGame();

    // TODO: temporary controls
    var controls = new THREE.OrbitControls(engine.camera);
    engine.on('update', function() {
        controls.update();
    });

    engine.run();
});

var Entity = require('component-engine').Entity;

function createGame() {
    var GameComponent = require('./lib/game_component');

    var entity = new Entity(engine);
    entity.addComponent(new GameComponent(entity));

    return entity;
}
