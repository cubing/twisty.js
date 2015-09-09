"use strict";

// function TwistyCube.State() {
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

// TwistyCube.State.__proto__ = {
// }


// function TwistyCubeTransformation() {
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

// TwistyCube.State.prototype = {
// }


// function TwistyCube.State() {
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

// TwistyCube.State.prototype = {
// }

var TwistyCube = function() {};

TwistyCube.Constants = {};

(function() {
  var quantizeMatrix4 = function(m) {
    for (var i = 0; i < 16; i++) {
      m.elements[i] = Math.round(m.elements[i]);
    }
    return m;
  }

  TwistyCube.Constants.Sides = ["U", "L", "F", "R", "B", "D"];

  var TURN = Math.PI * 2;
  TwistyCube.Constants.toSideFromF = {
    U: quantizeMatrix4(new THREE.Matrix4().makeRotationX(-TURN / 4)),
    L: quantizeMatrix4(new THREE.Matrix4().makeRotationY(-TURN / 4)),
    F: quantizeMatrix4(new THREE.Matrix4().makeRotationZ(    0    )),
    R: quantizeMatrix4(new THREE.Matrix4().makeRotationY( TURN / 4)),
    B: quantizeMatrix4(new THREE.Matrix4().makeRotationY( TURN / 2)),
    D: quantizeMatrix4(new THREE.Matrix4().makeRotationX( TURN / 4))
  };
})();

TwistyCube.Scene = function(dimension, container) {

  Twisty.Scene.call(this, container);

  this._dimension = dimension;
  this._locations = []
  this._twistyCubeCoordinatesToLocation = {};

  var scale = 120;

  for (var s in TwistyCube.Constants.Sides) {
    var side = TwistyCube.Constants.Sides[s];
    for (var i = 0; i < this._dimension; i++) {
      for (var j = 0; j < this._dimension; j++) {

        var element = document.createElement('div');
        element.classList.add("sticker", side);
        element.style.backgroundPosition = "" + ((j) * 100) + "% " + ((i) * 100) + "%";
        var object = new THREE.CSS3DObject(element);

        var twistyCubeCoordinates = new THREE.Vector3(
            2 * j + (1 - this._dimension),
          -(2 * i + (1 - this._dimension)),
                         this._dimension
        );

        var pos = new THREE.Vector3().copy(twistyCubeCoordinates).multiplyScalar(scale / 2).add(new THREE.Vector3(0, 0, 0.1));
        var m2 = new THREE.Matrix4().setPosition(pos);

        object.matrix.scale(new THREE.Vector3(1 / this._dimension, 1 / this._dimension, 1 / this._dimension));
        object.matrix.multiply(TwistyCube.Constants.toSideFromF[side]);
        object.matrix.multiply(m2);

        object.matrixAutoUpdate = false;
        this._scene.add(object);

        twistyCubeCoordinates.applyMatrix4(TwistyCube.Constants.toSideFromF[side]);

        var location = {
          sticker: object,
          twistyCubeCoordinates: twistyCubeCoordinates,
          matrix: object.matrix.clone()
        };
        this._locations.push(location);
        this._twistyCubeCoordinatesToLocation[twistyCubeCoordinates] = location;
      }
    }
  }

  this._render();
}

TwistyCube.Scene.prototype = {
  _animate: function() {

      var m = new THREE.Matrix4().makeRotationY( Math.PI / 360 / 10);
      for (var i in this._locations) {
        this._locations[i].sticker.matrix.multiplyMatrices(m, this._locations[i].sticker.matrix);
      }
      this._render();

      Twisty.Scene.prototype._animate.call(this);
  },

  __proto__: Twisty.Scene.prototype
}

TwistyCube.Scene.WindowResizeListener = function(twistyCubeScene) {
  window.addEventListener('resize', this._onWindowResize.bind(this), false);
  this._twistyCubeScenes = [];
}

TwistyCube.Scene.WindowResizeListener.prototype = {
  addTwistyCubeScene: function(twistyCubeScene) {
    this._twistyCubeScenes.push(twistyCubeScene);
  },

  removeTwistyCubeScene: function(twistyCubeScene) {
    for (var i in this._twistyCubeScenes) {
      if (this._twistyCubeScenes[i] == twistyCubeScene) {
        this._twistyCubeScenes.splice(i, 1);
        return;
      }
    }
  },

  _onWindowResize: function() {
    for (var i in this._twistyCubeScenes) {
      this._twistyCubeScenes[i].resizeRendererToDomElement();
    }
  }
}

// Singleton. Call functions on this.
TwistyCube.Scene.windowResizeListener = new TwistyCube.Scene.WindowResizeListener();

for (var dimension = 2; dimension < 2 + 4; dimension++) {
  var div = document.createElement("div");
  div.classList.add("container");
  document.body.appendChild(div);
  var twistyCubeScene = new TwistyCube.Scene(dimension, div);
  TwistyCube.Scene.windowResizeListener.addTwistyCubeScene(twistyCubeScene);
  twistyCubeScene._animate();
}