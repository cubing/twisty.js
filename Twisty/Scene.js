"use strict";

var Twisty = {};

Twisty.Scene = function(container) {
  this._container = container;
  this._scene = new THREE.Scene();

  var zoom = 256;
  this._camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
  this._camera.position.x = zoom;
  this._camera.position.y = zoom;
  this._camera.position.z = zoom;
  this._camera.lookAt(new THREE.Vector3(0, 0, -1));
  this._camera.updateProjectionMatrix();

  this._renderer = new THREE.CSS3DRenderer();
  this._renderer.setSize(this._container.offsetWidth, this._container.offsetHeight);
  this._container.appendChild(this._renderer.domElement);

  this._controls = new THREE.TrackballControls(this._camera, this._renderer.domElement);
  this._controls.rotateSpeed = 6;
  this._controls.minDistance = 1;
  this._controls.maxDistance = 1000;
  this._controls.dynamicDampingFactor = 1;
  this._controls.addEventListener('change', this._render.bind(this));
};

Twisty.Scene.prototype = {
  _animate: function() {
      this._controls.update();
      requestAnimationFrame(this._animate.bind(this));
  },

  _render: function() {
    this._renderer.render(this._scene, this._camera);
  },

  resizeRendererToDomElement: function() {
      this._renderer.setSize(this._container.offsetWidth, this._container.offsetHeight);
      this._render();
  },
};
