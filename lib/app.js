let compo = require('compojs');

/**
 * The application singleton.
 * Serves as the main driver for this program.
 */
class App {
    /**
     * Initialize the application.
     */
    setup(options) {
        this._engine = compo.createEngine()
            .registerComponent('GameComponent', require('./game_component'))
            .registerComponent('RenderSystem', require('./render_system'))
            .registerComponent('InputSystem', require('./input_system'));

        // System creation.
        let systems = this._engine.createEntity('systems')
            .addComponent('RenderSystem', {
                fov: options.fov,
                clearColor: options.canvasClearColor,
            })
            .addComponent('InputSystem');
        this._renderSystem = systems.getComponent('RenderSystem');
        this._inputSystem = systems.getComponent('InputSystem');

        this._engine.createEntity()
            .addComponent('GameComponent');
    }

    /**
     * Gogogo!
     */
    run() {
        this._engine.run();
    }

    get engine() {
        return this._engine;
    }

    get deltaTime() {
        return this._engine.time.deltaTime;
    }

    get canvas() {
        return this._renderSystem.canvas;
    }

    get activeScene() {
        return this._renderSystem.scene;
    }

    get activeCamera() {
        return this._renderSystem.camera;
    }

    get inputSystem() {
        return this._inputSystem;
    }
}

module.exports = new App();
