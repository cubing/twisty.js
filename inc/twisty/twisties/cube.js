/*
 * Rubik's Cube NxNxN
 */
function createCubeTwisty(twistyScene, twistyParameters, scene) {

  log("Creating cube twisty.");

  // Cube Variables
  var cubeObject = new THREE.Object3D();
  var cubePieces = [];



var innerGeometry = new THREE.PlaneGeometry(1.8, 1.8);
var innerTemplate = new THREE.Mesh(innerGeometry);


innerTemplate.translateZ(1);
scene.add(innerTemplate);

var w = 1.95;
var cubieGeometry = new THREE.CubeGeometry(w, w, w);
var cubieMaterial = new THREE.MeshBasicMaterial( { color: 0x000040, overdraw: 0.5 });
cubieTemplate = new THREE.Mesh(cubieGeometry, cubieMaterial);

    scene.add(cubieTemplate);


  function cameraScale() {
    return 2;
  }

  return {
    "type": twistyParameters,
    "3d": cubeObject,
    "cubePieces": cubePieces,
    "cameraScale": cameraScale
  };

}

twistyjs.registerTwisty("cube", createCubeTwisty);
