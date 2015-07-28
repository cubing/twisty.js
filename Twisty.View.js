// if (!Twisty) {
//   Twisty = {};
// }
// var Twisty.View = function() {}

var camera, scene, renderer;
var controls;


var sides = {
  U: {rotation: new THREE.Matrix4().makeRotationX(-Math.PI / 2)},
  L: {rotation: new THREE.Matrix4().makeRotationY(-Math.PI / 2)},
  F: {rotation: new THREE.Matrix4().makeRotationZ(       0    )},
  R: {rotation: new THREE.Matrix4().makeRotationY( Math.PI / 2)},
  B: {rotation: new THREE.Matrix4().makeRotationY( Math.PI    )},
  D: {rotation: new THREE.Matrix4().makeRotationX( Math.PI / 2)},
};

function init() {

  var dimension = 3;

  var scale = 120;
  zoom = 256;
  scene = new THREE.Scene();

  console.log(sides);

  for (s in sides) {
    var side = sides[s];

    for (var i = 0; i < dimension; i++) {
      for (var j = 0; j < dimension; j++) {
        var element = document.createElement('div');
        element.classList.add("sticker", s);
        element.style.backgroundPosition = "" + ((i) * 100) + "% " + ((j) * 100) + "%";
        var object = new THREE.CSS3DObject(element);

        var m2 = new THREE.Matrix4()
        m2.makeTranslation((i + (1 - dimension) / 2) * scale, (j + (1 - dimension) / 2) * scale, dimension / 2 * scale + 0.01);

        object.matrix.scale(new THREE.Vector3(1 / dimension, 1 / dimension, 1 / dimension));
        object.matrix.multiply(sides[s].rotation);
        object.matrix.multiply(m2);

        object.matrixAutoUpdate = false;
        scene.add(object);
      }
    }
  }


  camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
  camera.position.x = zoom;
  camera.position.y = zoom;
  camera.position.z = zoom;
  camera.lookAt(new THREE.Vector3(0, 0, -1));
  camera.updateProjectionMatrix();

  renderer = new THREE.CSS3DRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('container').appendChild(renderer.domElement);

  controls = new THREE.TrackballControls(camera, renderer.domElement);
  controls.rotateSpeed = 6;
  controls.minDistance = 1;
  controls.maxDistance = 1000;
  controls.dynamicDampingFactor = 1;
  controls.addEventListener('change', render);

  render();

  window.addEventListener('resize', onWindowResize, false);
}

function render() {
    renderer.render(scene, camera);
}

function onWindowResize() {
    // camera.aspect = window.innerWidth / window.innerHeight; // Not needed?
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
}



init();
animate();