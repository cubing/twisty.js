/*
 * Something simple for fallback/testing.
 */
function createPlaneTwisty(twistyScene, twistyType) {

  log("Creating plane twisty.");

  var cubePieces = [];

  var material = new THREE.MeshLambertMaterial({color: 0xFF8800});
  var plane = new THREE.Mesh( new THREE.PlaneGeometry(1, 1), material);
  plane.rotation.x = Math.TAU/4;
  plane.doubleSided = true;

  var updateTwistyCallback = function(twisty) {
    twisty["3d"].rotation.z += 0.01;
  };

  return {
    "type": twistyType,
    "3d": plane,
    "updateTwistyCallback": updateTwistyCallback
  };

}

twistyjs.registerTwisty("plane", createPlaneTwisty);
