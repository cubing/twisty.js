var aaa, bbb;

/*
 * that.twisty.js
 *
 * Started by Lucas Garron, July 22, 2011 at WSOH
 * Made classy by Jeremy Fleischman, October 7, 2011 during the flight to worlds
 *
 */

"use strict";

if(typeof(assert) == "undefined") {
  // TODO - this is pretty lame, we could use something like stacktrace.js
  // to get some useful information here.
  var assert = function(cond, str) {
    if(!cond) {
      if(str) {
        throw str;
      } else {
        throw "Assertion Error";
      }
    }
  };
}

var twistyjs = {};

(function() {

/****************
 *
 * that.twisty Plugins
 *
 * Plugins register themselves by calling twistyjs.registerTwisty.
 * This lets plugins be defined in different files.
 *
 */

twistyjs.twisties = {};

twistyjs.TwistyScene = function(options) {

  // that=this is a Crockford convention for accessing "this" inside of methods.
  var that = this;

  /******** Instance Variables ********/

  var model = {
    twisty: null,
    preMoveList: [],
    moveList: [],

    time: null,
    position: null,
  }

  var view = {
    camera: null,
    container: null,
    scene: null,
    renderer: null
  }

  var control = {
    cameraTheta: null,
    mouseXLast: null,

    speed: null,

    animating: false,
    stopAfterNextMove: false
  }

  this.debug = {
    stats: null,
    model: model,
    view: view
  }


  /******** General Initialization ********/


  var iniDefaults = {
    speed: 3, // qtps
    renderer: THREE.CanvasRenderer,
    allowDragging: true,
    stats: true
  }

  function initialize(options) {
    options = getOptions(options, iniDefaults);

    view.initialize(options.renderer);

    control.speed = options.speed;
    if (options.allowDragging) { that.startAllowDragging(); }
    if (options.stats) { startStats(); }
  }



  /******** Model: Initialization ********/


  this.initializeTwisty = function(twistyType) {

    model.position = 0;
    model.preMoveList = [];
    model.moveList = [];

    that.twisty = createTwisty(twistyType);
    view.scene.add(that.twisty["3d"]);

    that.resize();
  }

  this.resize = function() {
    var width = $(view.container).width();
    var height = $(view.container).height()
    var min = Math.min(width, height);
    view.camera.setViewOffset(min,  min, (min - width)/2, (min - height)/2, width, height);

    moveCameraDelta(0);
    view.renderer.setSize(width, height);
    renderOnce();
  };


  /******** View: Initialization ********/

  view.initialize = function(Renderer) {
    view.scene = new THREE.Scene();
    view.camera = new THREE.PerspectiveCamera( 30, 1, 0.001, 1000 );

    view.renderer = new Renderer({antialias: true});

    var canvas = view.renderer.domElement;
    $(canvas).css('position', 'absolute').css('top', 0).css('left', 0);

    var container = $('<div/>').css('width', '100%').css('height', '100%');
    view.container = container[0];
    container.append(canvas);
  }


  /******** View: Rendering ********/

  function render() {
    view.renderer.render(view.scene, view.camera);
    that.debug.stats.update();
  }

  function renderOnce() {
    if (!control.animating) {
      requestAnimFrame(render);
    }
  }


  /******** View: Camera ********/


  this.setCameraTheta = function(theta) {
    control.cameraTheta = theta;
    var scale = that.twisty.cameraScale();
    view.camera.position.x = 2.5*Math.sin(theta) * scale;
    view.camera.position.y = 2 * scale;
    view.camera.position.z = 2.5*Math.cos(theta) * scale;
    view.camera.lookAt(new THREE.Vector3(0, -0.075 * scale, 0));
  }

  function moveCameraDelta(deltaTheta) {
    that.setCameraTheta(control.cameraTheta + deltaTheta);
  }


  /******** Control: Mouse/Touch Dragging ********/

  this.startAllowDragging = function() {
    $(view.container).css("cursor", "move");
    view.container.addEventListener("mousedown", onStart, false );
    view.container.addEventListener("touchstart", onStart, false );
  }

  var listeners = {
    "mouse": {
      "mousemove": onMove,
      "mouseup": onEnd
    },
    "touch": {
      "touchmove": onMove,
      "touchend": onEnd
    }
  }

  function eventKind(event) {
    if (event instanceof MouseEvent) {
      return "mouse";
    }
    else if (event instanceof TouchEvent) {
      return "touch";
    }
    throw "Unknown event kind.";
  }

  function onStart(event) {
    var kind = eventKind(event);

    control.mouseXLast = (kind == "mouse") ? event.clientX : event.touches[0].pageX;
    event.preventDefault();
    renderOnce();

    for (listener in listeners[kind]) {
      window.addEventListener(listener, listeners[kind][listener], false);
    }
  }

  function onMove(event) {
    var kind = eventKind(event);

    mouseX = (kind == "mouse") ? event.clientX : event.touches[0].pageX;
    event.preventDefault();
    moveCameraDelta((control.mouseXLast - mouseX)/256);
    control.mouseXLast = mouseX;

    renderOnce();
  }

  function onEnd(event) {
    var kind = eventKind(event);
    for (listener in listeners[kind]) {
      window.removeEventListener(listener, listeners[kind][listener], false);
    }
  }


  /******** Control: Keyboard ********/

  this.keydown = function(e) {

    var keyCode = e.keyCode;
    that.twisty.keydownCallback(that.twisty, e);

    switch (keyCode) {

      case 37: // Left
        moveCameraDelta(Math.PI/24);
        e.preventDefault();
        renderOnce();
        break;

      case 39: // Right
        moveCameraDelta(-Math.PI/24);
        e.preventDefault();
        renderOnce();
        break;

    }
  };


  /******** Control: Move Listeners ********/

  // var moveListeners = [];
  this.addMoveListener = function(listener) {
  //   moveListeners.push(listener);
  };
  // this.removeMoveListener = function(listener) {
  //   var index = moveListeners.indexOf(listener);
  //   assert(index >= 0);
  //   delete moveListeners[index];
  // };
  // function fireMoveStarted(move) {
  //   for(var i = 0; i < moveListeners.length; i++) {
  //     moveListeners[i](move, true);
  //   }
  // }
  // function fireMoveEnded(move) {
  //   for(var i = 0; i < moveListeners.length; i++) {
  //     moveListeners[i](move, false);
  //   }
  // }


  /******** Control: Animation ********/

  function triggerAnimation() {
    if (!control.animating) {
      model.time = Date.now();
      control.animating = true;
      animFrame();
    }
  }

  function animFrame() {

    if (control.animating) {

      var prevTime = model.time;
      var prevPosition = model.position;

      model.time = Date.now();
      model.position = prevPosition + (model.time - prevTime) * control.speed / 1000;

      if (Math.floor(model.position) > Math.floor(prevPosition)) {
        // If we finished a move, snap to the beginning of the next. (Will never skip a move.)
        model.position = Math.floor(prevPosition) + 1;
        var prevMove = model.moveList[Math.floor(prevPosition)];
        that.twisty["animateMoveCallback"](that.twisty, prevMove, 1);
        that.twisty["advanceMoveCallback"](that.twisty, prevMove);

        if (control.stopAfterNextMove) {
          control.stopAfterNextMove = false;
          control.animating = false;
        }
      }
      else {
        var currentMove = model.moveList[Math.floor(model.position)];
        that.twisty["animateMoveCallback"](that.twisty, currentMove, model.position % 1);
      }

      if (model.position >= totalLength()) {
        model.position = totalLength();
        control.animating = false;
      }
    }

    render();

    if (control.animating) {
      requestAnimFrame(animFrame);
    }
  }

  function totalLength() {
    // var total = 0;
    // for (var move in model.moveList) {
    //   total += 1;
    // }
    return model.moveList.length;
  }


  /******** Control: Playback ********/


  function currentMove() {
    return model.moveList[model.currentMoveIdx];
  }

  var setupDefaults = {
    init: [],
    type: "generator"
  }

  this.setupAnimation = function(algIn, opts) {
    opts = getOptions(opts, setupDefaults);

    model.animating = false;

    model.preMoveList = opts.init;
    if (opts.type === "solve") {
      var algInverse = alg.sign_w.invert(algIn);
      model.preMoveList = model.preMoveList.concat(algInverse);
    }
    that.applyMoves(model.preMoveList);

    model.moveList = algIn;

    renderOnce();
  }

  function stopAnimation() {
    // TODO: Graceful stopping.
    control.animating = false
  }
  function startAnimation() {
    triggerAnimation();
  }

  this.addMoves = function(moves) {
    model.moveList = model.moveList.concat(moves);
    triggerAnimation();
  };

  this.stopAnimation = stopAnimation;
  this.startAnimation = startAnimation;

  this.applyMoves = function(moves) {
    for (i in moves) {
      that.twisty["advanceMoveCallback"](that.twisty, moves[i]);
    }
  };

  this.setIndex = function(idx) {
    var moveListSaved = model.moveList;
    that.initializeTwisty(model.twistyType); // Hack
    model.moveList = moveListSaved;
    if (model.mode === "playback") {
      that.applyMoves(model.preMoveList);
    }
    while (model.currentMoveIdx < idx) {
      startMove();
      that.twisty["advanceMoveCallback"](that.twisty, currentMove());
    }
    renderOnce();
  }

  this.stopPlayback = function() {
    control.stopAfterNextMove = true;
  }

  // this.debug.getIndex = function() {
  //   return model.currentMoveIdx;
  // }


  /******** Getters/setters ********/

  this.getMoveList = function() {
    return model.moveList;
  }

  this.getDomElement = function() {
    return view.container;
  }

  this.setSpeed = function(speed) {
    control.speed = speed;
  }

  this.getCanvas = function() {
    return view.renderer.domElement;
  }


  /******** Twisty ********/

  function createTwisty(twistyType) {
    var twistyCreateFunction = twistyjs.twisties[twistyType.type];
    if(!twistyCreateFunction) {
      err('that.twisty type "' + twistyType.type + '" is not recognized!');
      return null;
    }

    return twistyCreateFunction(that, twistyType);
  }


  /******** Debugging ********/

  function startStats() {
    that.debug.stats = new Stats();
    that.debug.stats.domElement.style.position = 'absolute';
    that.debug.stats.domElement.style.top = '0px';
    that.debug.stats.domElement.style.left = '0px';
    view.container.appendChild( that.debug.stats.domElement );
    $(that.debug.stats.domElement).click();
  }


  /******** Convenience Functions ********/

  function getOptions(input, defaults) {
    var output = {};
    for (var key in defaults) {
      output[key] = (key in input) ? input[key] : defaults[key];
    }
    return output;
  }


  /******** Go! ********/

  initialize(options);

};

})();
