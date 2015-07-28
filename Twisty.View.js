// if (!Twisty) {
//   Twisty = {};
// }
// var Twisty.View = function() {}

var camera, scene, renderer;
var controls;

var objects = [];
var targets = {
    table: [],
    sphere: [],
    helix: [],
    grid: []
};

init();
animate();

function init() {

    var dimension = 3;

    var scale = 120;
    zoom = 100;
    scene = new THREE.Scene();

    var sides = function() {
        var h = dimension / 2;

        var x = new THREE.Vector3(h, 0, 0);
        var y = new THREE.Vector3(h, 0, 0);
        var z = new THREE.Vector3(h, 0, 0);

        var x_ = new THREE.Vector3().negate(x);
        var y_ = new THREE.Vector3().negate(y);
        var z_ = new THREE.Vector3().negate(z);

        var sides = {
            U: {face: new THREE.Matrix4().lookAt(z, z_, y)},
            L: {face: new THREE.Matrix4().lookAt(x_, x, z)},
            F: {face: new THREE.Matrix4().lookAt(y_, y, z)},
            R: {face: new THREE.Matrix4().lookAt(x, x_, z)},
            B: {face: new THREE.Matrix4().lookAt(y, y_, z)},
            D: {face: new THREE.Matrix4().lookAt(z_, z, y_)},
        }

        return sides;
    }();

    for (s in sides) {
        var side = sides[s];

        for (var i = 0; i < dimension; i++) {
            for (var j = 0; j < dimension; j++) {
                var element = document.createElement('div');
                element.classList.add("sticker", s);
                element.style.backgroundPosition = "" + ((i) * 100) + "% " + ((j) * 100) + "%";
                var object = new THREE.CSS3DObject(element);

                var element2 = document.createElement('div');
                element2.classList.add("cubie", s);
                element2.style.backgroundPosition = "" + ((i) * 100) + "% " + ((j) * 100) + "%";
                var object2 = new THREE.CSS3DObject(element2);

                object.matrixAutoUpdate = false;
                object2.matrixAutoUpdate = false;


                var m1 = new THREE.Matrix4();
                console.log(s);
                switch (s) {
                    case "U":
                        m1.makeRotationX(-Math.PI / 2);
                        break;
                    case "L":
                        m1.makeRotationY(-Math.PI / 2);
                        break;
                    case "F":
                        m1.makeRotationZ(0);
                        break;
                    case "R":
                        m1.makeRotationY(Math.PI / 2);
                        break;
                    case "B":
                        m1.makeRotationY(Math.PI);
                        break;
                    case "D":
                        m1.makeRotationX(Math.PI / 2);
                        break;
                }


                var m2 = new THREE.Matrix4()
                m2.makeTranslation((i + (1 - dimension) / 2) * scale, (j + (1 - dimension) / 2) * scale, dimension / 2 * scale + 0.01);

                object.matrix.scale(new THREE.Vector3(1 / dimension, 1 / dimension, 1 / dimension));
                object.matrix.multiply(m1);
                object.matrix.multiply(m2);

                var m22 = new THREE.Matrix4()
                m22.makeTranslation((i + (1 - dimension) / 2) * scale, (j + (1 - dimension) / 2) * scale, dimension / 2 * scale - 1);

                object2.matrix.scale(new THREE.Vector3(1 / dimension, 1 / dimension, 1 / dimension));
                object2.matrix.multiply(m1);
                object2.matrix.multiply(m22);

                // console.log(object.matrix);
                // object.matrix.multiply(side.face);
                // object.matrix.multiply(
                //  new THREE.Matrix4().set(
                //    1, 0, 0, 0,
                //    0, 1, 0, 0,
                //    0, 0, 1, 0,
                //    0, 0, 0, 1
                //  )
                // );

                // console.log(object.matrix);

                scene.add(object);
                scene.add(object2);
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
    controls.minDistance = 500;
    controls.maxDistance = 6000;
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
