
for (var dimension = 2; dimension < 2 + 4; dimension++) {
  var div = document.createElement("div");
  div.classList.add("container");
  document.body.appendChild(div);
  var twistyCubeScene = new Twisty.Puzzle.Cube.Scene(dimension, div);
  Twisty.Scene.windowResizeListener.addScene(twistyCubeScene);
  twistyCubeScene._animate();
  twistyCubeScene.test();
};
