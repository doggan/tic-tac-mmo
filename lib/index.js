'use strict';

document.addEventListener("DOMContentLoaded", main);

function main() {
    let appOptions = {
        fov: 60,
        canvasClearColor: 0x000000
    };

    let app = require('./app');
    app.setup(appOptions);
    app.run();
}
