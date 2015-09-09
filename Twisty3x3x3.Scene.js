"use strict";

// function Twisty3x3x3.State() {
//   // Based on ksolve.
//   this.CORNERS = {
//     "permutation": [0, 1, 2, 3, 4, 5, 6, 7],
//     "orientation": [0, 0, 0, 0, 0, 0, 0, 0]
//   }
//   this.EDGES = {
//     "permutation": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
//     "orientation": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
//   }
// }

// Twisty3x3x3.State.__proto__ = {
// }


// function Twisty3x3x3Transformation() {
//   // Based on ksolve.
//   this.CORNERS = {
//     "permutation": [0, 1, 2, 3, 4, 5, 6, 7],
//     "orientation": [0, 0, 0, 0, 0, 0, 0, 0]
//   }
//   this.EDGES = {
//     "permutation": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
//     "orientation": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
//   }
// }

// Twisty3x3x3.State.prototype = {
// }


// function Twisty3x3x3.State() {
//   // Based on ksolve.
//   this.CORNERS = {
//     "permutation": [0, 1, 2, 3, 4, 5, 6, 7],
//     "orientation": [0, 0, 0, 0, 0, 0, 0, 0]
//   }
//   this.EDGES = {
//     "permutation": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
//     "orientation": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
//   }
// }

// Twisty3x3x3.State.prototype = {
// }


var Twisty3x3x3 = {};

Twisty3x3x3.Constants = {};

  var quantizeMatrix4 = function(m) {
    for (var i = 0; i < 16; i++) {
      m.elements[i] = Math.round(m.elements[i]);
    }
    return m;
  }

  Twisty3x3x3.Constants.Sides = ["U", "L", "F", "R", "B", "D"];

  var TURN = Math.PI * 2;
  Twisty3x3x3.Constants.toSideFromF = {
    U: quantizeMatrix4(new THREE.Matrix4().makeRotationX(-TURN / 4)),
    L: quantizeMatrix4(new THREE.Matrix4().makeRotationY(-TURN / 4)),
    F: quantizeMatrix4(new THREE.Matrix4().makeRotationZ(    0    )),
    R: quantizeMatrix4(new THREE.Matrix4().makeRotationY( TURN / 4)),
    B: quantizeMatrix4(new THREE.Matrix4().makeRotationY( TURN / 2)),
    D: quantizeMatrix4(new THREE.Matrix4().makeRotationX( TURN / 4))
  };

Twisty3x3x3.Scene = function(dimension, container) {

  // var camera, scene, renderer;
  // var controls;

  this._dimension = dimension;
  this._container = container;
  this._locations = []
  this._twisty3x3x3CoordinatesToLocation = {};

  var dimension = 5;

  var scale = 110;
  var zoom = 256;
  this._scene = new THREE.Scene();

  for (var s in Twisty3x3x3.Constants.Sides) {
    var side = Twisty3x3x3.Constants.Sides[s];
    for (var i = 0; i < this._dimension; i++) {
      for (var j = 0; j < this._dimension; j++) {

        var element = document.createElement('div');
        element.classList.add("sticker", side);
        element.style.backgroundPosition = "" + ((j) * 100) + "% " + ((i) * 100) + "%";
        var object = new THREE.CSS3DObject(element);

        var twisty3x3x3Coordinates = new THREE.Vector3(
            2 * j + (1 - this._dimension),
          -(2 * i + (1 - this._dimension)),
                         this._dimension
        );

        var pos = new THREE.Vector3().copy(twisty3x3x3Coordinates).multiplyScalar(scale / 2).add(new THREE.Vector3(0, 0, 0.1));
        var m2 = new THREE.Matrix4().setPosition(pos);

        object.matrix.scale(new THREE.Vector3(1 / this._dimension, 1 / this._dimension, 1 / this._dimension));
        object.matrix.multiply(Twisty3x3x3.Constants.toSideFromF[side]);
        object.matrix.multiply(m2);

        object.matrixAutoUpdate = false;
        this._scene.add(object);

        twisty3x3x3Coordinates.applyMatrix4(Twisty3x3x3.Constants.toSideFromF[side]);

        var location = {
          sticker: object,
          twisty3x3x3Coordinates: twisty3x3x3Coordinates,
          matrix: object.matrix.clone()
        };
        this._locations.push(location);
        this._twisty3x3x3CoordinatesToLocation[twisty3x3x3Coordinates] = location;
      }
    }
  }


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

  this._render();
}

Twisty3x3x3.Scene.prototype = {
  _render: function() {
    this._renderer.render(this._scene, this._camera);
  },

  resizeRendererToDomElement: function() {
      this._renderer.setSize(this._container.offsetWidth, this._container.offsetHeight);
      this._render();
  },

  _animate: function() {

      var m = new THREE.Matrix4().makeRotationY( Math.PI / 360 / 10);
      for (var i in this._locations) {
        this._locations[i].sticker.matrix.multiplyMatrices(m, this._locations[i].sticker.matrix);
      }
      this._render();

      requestAnimationFrame(this._animate.bind(this));
      this._controls.update();
  }
}

Twisty3x3x3.Scene.WindowResizeListener = function(twisty3x3x3Scene) {
  window.addEventListener('resize', this._onWindowResize.bind(this), false);
  this._twisty3x3x3Scenes = [];
}

Twisty3x3x3.Scene.WindowResizeListener.prototype = {
  addTwisty3x3x3Scene: function(twisty3x3x3Scene) {
    this._twisty3x3x3Scenes.push(twisty3x3x3Scene);
  },

  removeTwisty3x3x3Scene: function(twisty3x3x3Scene) {
    for (var i in this._twisty3x3x3Scenes) {
      if (this._twisty3x3x3Scenes[i] == twisty3x3x3Scene) {
        this._twisty3x3x3Scenes.splice(i, 1);
        return;
      }
    }
  },

  _onWindowResize: function() {
    for (var i in this._twisty3x3x3Scenes) {
      this._twisty3x3x3Scenes[i].resizeRendererToDomElement();
    }
  }
}

// Singleton. Call functions on this.
Twisty3x3x3.Scene.windowResizeListener = new Twisty3x3x3.Scene.WindowResizeListener();

for (var dimension = 2; dimension < 2 + 4; dimension++) {
  var div = document.createElement("div");
  div.classList.add("container");
  document.body.appendChild(div);
  var twisty3x3x3Scene = new Twisty3x3x3.Scene(dimension, div);
  Twisty3x3x3.Scene.windowResizeListener.addTwisty3x3x3Scene(twisty3x3x3Scene);
  twisty3x3x3Scene._animate();
}