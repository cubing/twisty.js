"use strict";

if (!Twisty.Puzzle) {
  Twisty.Puzzle = function() {};
}

Twisty.Puzzle.Cube = function() {};

Twisty.Puzzle.Cube.Constants = {};

(function() {
  var quantizeMatrix4 = function(m) {
    for (var i = 0; i < 16; i++) {
      m.elements[i] = Math.round(m.elements[i]);
    }
    return m;
  }

  Twisty.Puzzle.Cube.Constants.Sides = ["U", "L", "F", "R", "B", "D"];

  var TURN = Math.PI * 2;
  Twisty.Puzzle.Cube.Constants.toSideFromF = {
    U: quantizeMatrix4(new THREE.Matrix4().makeRotationX(-TURN / 4)),
    L: quantizeMatrix4(new THREE.Matrix4().makeRotationY(-TURN / 4)),
    F: quantizeMatrix4(new THREE.Matrix4().makeRotationZ(    0    )),
    R: quantizeMatrix4(new THREE.Matrix4().makeRotationY( TURN / 4)),
    B: quantizeMatrix4(new THREE.Matrix4().makeRotationY( TURN / 2)),
    D: quantizeMatrix4(new THREE.Matrix4().makeRotationX( TURN / 4))
  };
})();

Twisty.Puzzle.Cube.Scene = function(dimension, container) {

  Twisty.Scene.call(this, container);

  this._dimension = dimension;
  this._locations = []
  this._twistyCubeCoordinatesToLocation = {};

  var scale = 120;

  for (var s in Twisty.Puzzle.Cube.Constants.Sides) {
    var side = Twisty.Puzzle.Cube.Constants.Sides[s];
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
        object.matrix.multiply(Twisty.Puzzle.Cube.Constants.toSideFromF[side]);
        object.matrix.multiply(m2);

        object.matrixAutoUpdate = false;
        this._scene.add(object);

        twistyCubeCoordinates.applyMatrix4(Twisty.Puzzle.Cube.Constants.toSideFromF[side]);

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
};

Twisty.Puzzle.Cube.Scene.prototype = {
  _animate: function() {

      var m = new THREE.Matrix4().makeRotationY( Math.PI / 360 / 10);
      for (var i in this._locations) {
        this._locations[i].sticker.matrix.multiplyMatrices(m, this._locations[i].sticker.matrix);
      }
      this._render();

      Twisty.Scene.prototype._animate.call(this);
  },

  __proto__: Twisty.Scene.prototype
};
