'use strict';

var ComponentEngine = require('component-engine').Engine;

document.addEventListener("DOMContentLoaded", function() {
    var engine = new ComponentEngine({
        clearColor: 0xDEDEDE
    });

    var THREE = engine.THREE;

    engine.on('update', function() {

    });

    engine.on('render', function() {
        // DbgDraw.render(engine.scene);
    });

    engine.run();
});
