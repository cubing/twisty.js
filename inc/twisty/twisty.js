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
    moveList: [],
    preMoveList: [],
    twisty: null,
    mode: null,

    time: null,
    position: null,
  }

  var view = {
    camera: null,
    scene: null,
    renderer: null,
    container: null,
    cameraTheta: null,
    animating: false
  }

  var control = {
    mouseXLast: null
  }

  this.debug = {
    status: null,
    model: model,
    view: view
  }

  /* http://tauday.com/ ;-) */
  Math.TAU = Math.PI*2;

  function currentMove() {
    return model.moveList[model.currentMoveIdx];
  }

  this.getDomElement = function() {
    return view.container;
  };

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

  /******** Model: Initialization ********/


  this.initializeTwisty = function(twistyType) {

    model.position = 0;
    model.moveList = [];

    that.twisty = createTwisty(twistyType);
    view.scene.add(that.twisty["3d"]);

    // resize creates the camera and calls render()
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


  var viewDefaults = {
    speed: 3, // qtps
    renderer: THREE.CanvasRenderer,
    allowDragging: true,
    stats: true
  }

  view.initialize = function(options) {
    options = getOptions(options, viewDefaults);

    view.scene = new THREE.Scene();
    view.camera = new THREE.PerspectiveCamera( 30, 1, 0.001, 1000 );

    view.renderer = new options.renderer({antialias: true});

    var canvas = view.renderer.domElement;
    $(canvas).css('position', 'absolute').css('top', 0).css('left', 0);

    var container = $('<div/>').css('width', '100%').css('height', '100%');
    view.container = container[0];
    container.append(canvas);

    view.speed = options.speed;
    if (options.allowDragging) { that.startAllowDragging(); }
    if (options.stats) { startStats(); }
  }


  /******** View: Rendering ********/

  function render() {
    view.renderer.render(view.scene, view.camera);
    that.debug.stats.update();
  }

  function renderOnce() {
    if (!view.animating) {
      requestAnimFrame(render);
    }
  }


  /******** View: Camera ********/


  this.setCameraTheta = function(theta) {
    view.cameraTheta = theta;
    var scale = that.twisty.cameraScale();
    view.camera.position.x = 2.5*Math.sin(theta) * scale;
    view.camera.position.y = 2 * scale;
    view.camera.position.z = 2.5*Math.cos(theta) * scale;
    view.camera.lookAt(new THREE.Vector3(0, -0.075 * scale, 0));
  }

  function moveCameraDelta(deltaTheta) {
    that.setCameraTheta(view.cameraTheta + deltaTheta);
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
        moveCameraDelta(Math.TAU/48);
        e.preventDefault();
        renderOnce();
        break;

      case 39: // Right
        moveCameraDelta(-Math.TAU/48);
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

  function totalLength() {
    // var total = 0;
    // for (var move in model.moveList) {
    //   total += 1;
    // }
    return model.moveList.length;
  }

  function triggerAnimation() {
    if (!view.animating) {
      model.time = Date.now();
      view.animating = true;
      animFrame();
    }
  }

  function animFrame() {

    //TODO: Handle non-animating rotation.
    if (view.animating) {

      var prevTime = model.time;
      var prevPosition = model.position;

      model.time = Date.now();
      model.position = prevPosition + (model.time - prevTime) * view.speed / 1000;

      if (Math.floor(model.position) > Math.floor(prevPosition)) {
        // If we finished a move, snap to the beginning of the next. (Will never skip a move.)
        model.position = Math.floor(prevPosition) + 1;
        var prevMove = model.moveList[Math.floor(prevPosition)];
        that.twisty["animateMoveCallback"](that.twisty, prevMove, 1);
        that.twisty["advanceMoveCallback"](that.twisty, prevMove);
      }
      else {
        var currentMove = model.moveList[Math.floor(model.position)];
        that.twisty["animateMoveCallback"](that.twisty, currentMove, model.position % 1);
      }

      if (model.position >= totalLength()) {
        model.position = totalLength();
        view.animating = false;
      }
    }

    render();

    if (view.animating) {
      requestAnimFrame(animFrame);
    }
  }

  function stopAnimation() {
    // TODO: Graceful stopping.
    view.animating = false
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

  this.getMoveList = function() {
    return model.moveList;
  }

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

  // this.debug.getIndex = function() {
  //   return model.currentMoveIdx;
  // }


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

  view.initialize(options);

};

})();
