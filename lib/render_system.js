'use strict';

let THREE = require('three');

class RenderSystem {
    constructor(options) {
        this._canvas = document.getElementById('canvas');
        if (!this._canvas) {
            throw "'canvas' element not found.";
        }

        let fov = (typeof options.fov === 'undefined') ? 60 : options.fov;
        this._camera = new THREE.PerspectiveCamera(
            fov,
            this._canvas.width / this._canvas.height,
            0.1, 10000);
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix();

        this._scene = new THREE.Scene();
        this._renderer = new THREE.WebGLRenderer({
            canvas: this._canvas
        });

        let clearColor = (typeof options.clearColor === 'undefined') ? 0xFFFFFF : options.clearColor;
        this._renderer.setClearColor(clearColor, 1);
        this._renderer.setSize(window.innerWidth, window.innerHeight);

        window.addEventListener('resize', this._onWindowResize.bind(this), false);

        // TODO: temporary
        // this._controls = new THREE.OrbitControls(this._camera);
        this._camera.position.z = 500;
    }

    _onWindowResize() {
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix();
        this._renderer.setSize(window.innerWidth, window.innerHeight);
    }

    get scene() {
        return this._scene;
    }

    get camera() {
        return this._camera;
    }

    get canvas() {
        return this._canvas;
    }

    update() {
        // TODO:
        // this._controls.update();

        this._renderer.clearDepth();
        this._renderer.render(this._scene, this._camera);
    }
}

module.exports = function(options) {
    return new RenderSystem(options);
};
