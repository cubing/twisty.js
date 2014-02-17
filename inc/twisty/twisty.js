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
    canvas: null,
    container: null,
    cameraTheta: null,
    theta: null,
    animating: false
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

  function getOptions(input, defaults) {
    var output = {};
    for (var key in defaults) {
      output[key] = (key in input) ? input[key] : defaults[key];
    }
    return output;
  }

  var initializeDefaults = {
    speed: 3, // qtps
    renderer: THREE.CanvasRenderer,
    allowDragging: true,
    stats: true
  }

  view.initialize = function(options) {
    options = getOptions(options, initializeDefaults);

    view.scene = new THREE.Scene();
    view.camera = new THREE.PerspectiveCamera( 30, 1, 0.001, 1000 );

    var rendererType = options.renderer; // TODO: Standardize option handling in this function.
    view.renderer = new rendererType({antialias: true});

    view.canvas = view.renderer.domElement;
    $(view.canvas).css('position', 'absolute');
    $(view.canvas).css('top', 0);
    $(view.canvas).css('left', 0);

    var container = $('<div/>');
    container.css('width', '100%');
    container.css('height', '100%');
    view.twistyContainer = container[0];
    view.twistyContainer.appendChild(view.canvas);

    view.speed = options.speed;
    if (options.allowDragging) { that.startAllowDragging(); }
    if (options.stats) { startStats(); }
  }

  this.initializeTwisty = function(twistyType) {

    model.position = 0;
    model.moveList = [];

    that.twisty = createTwisty(twistyType);
    view.scene.add(that.twisty["3d"]);

    // resize creates the camera and calls render()
    that.resize();
  }

  this.getDomElement = function() {
    return view.twistyContainer;
  };
  this.getCanvas = function() {
    return view.canvas;
  };
  this.getTwisty = function() {
    return that.twisty;
  };

  this.setupAnimation = function(algIn, opts) {
    opts = opts || {};
    opts.init = (typeof opts.init === "undefined") ? [] : opts.init;
    if (opts.type !== "solve") { opts.type = "generator"; }

    // console.log("---");
    // console.log(opts.init);
    // console.log(opts.type);

    model.mode = "playback";

    that.applyMoves(opts.init);
    model.preMoveList = opts.init;

    if (opts.type === "solve") {
      // console.log("alg", algIn);
      var algInverse = alg.sign_w.invert(algIn);
      // console.log("alg", algInverse);
      that.applyMoves(algInverse);
      model.preMoveList = model.preMoveList.concat(algInverse);
      renderOnce();
    }

    that.addMoves(algIn);
    stopAnimation();
    model.currentMoveIdx = -1;
  }

  this.resize = function() {

    var width = $(view.twistyContainer).width();
    var height = $(view.twistyContainer).height()

    var min = Math.min(width, height);
    view.camera.setViewOffset(min,  min, (min - width)/2, (min - height)/2, width, height);

    moveCameraDelta(0);
    view.renderer.setSize(width, height);
    renderOnce();
  };

  this.keydown = function(e) {
    var keyCode = e.keyCode;
    //log(keyCode);
    that.twisty.keydownCallback(that.twisty, e);

    switch (keyCode) {

      case 37:
        moveCameraDelta(Math.TAU/48);
        e.preventDefault();
        renderOnce();
        break;

      case 39:
        moveCameraDelta(-Math.TAU/48);
        e.preventDefault();
        renderOnce();
        break;

    }
  };


  /******** Dragging/Rotation ********/

  this.startAllowDragging = function() {
    $(view.twistyContainer).css("cursor", "move");
    view.twistyContainer.addEventListener("mousedown", onStart, false );
    view.twistyContainer.addEventListener("touchstart", onStart, false );
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

    view.mouseXLast = (kind == "mouse") ? event.clientX : event.touches[0].pageX;
    event.preventDefault();
    renderOnce();

    for (listener in listeners[kind]) {
      window.addEventListener(listener, listeners[kind][listener], false);
    }
  }

  function onMove(event) {
    var kind = eventKind(event);

    view.mouseX = (kind == "mouse") ? event.clientX : event.touches[0].pageX;
    event.preventDefault();
    that.cam((view.mouseXLast - view.mouseX)/256);
    view.mouseXLast = view.mouseX;

    renderOnce();
  }

  function onEnd(event) {
    var kind = eventKind(event);
    for (listener in listeners[kind]) {
      window.removeEventListener(listener, listeners[kind][listener], false);
    }
  }



  function render() {
    view.renderer.render(view.scene, view.camera);
    that.debug.stats.update();
  }

  function renderOnce() {
    if (!view.animating) {
      render();
    }
  }


  this.cam = function(deltaTheta) {
    view.theta += deltaTheta;
    moveCamera(view.theta);
  }

  function moveCameraPure(theta) {
    view.cameraTheta = theta;
    var scale = that.twisty.cameraScale();
    view.camera.position.x = 2.5*Math.sin(theta) * scale;
    view.camera.position.y = 2 * scale;
    view.camera.position.z = 2.5*Math.cos(theta) * scale;
    view.camera.lookAt(new THREE.Vector3(0, -0.075 * scale, 0));
  }

  function moveCameraDelta(deltaTheta) {
    view.cameraTheta += deltaTheta;
    moveCameraPure(view.cameraTheta);
    // render();
  }

  function moveCamera(theta) {
    moveCameraPure(theta);
    // render();
  }

  var moveListeners = [];
  this.addMoveListener = function(listener) {
    moveListeners.push(listener);
  };
  this.removeMoveListener = function(listener) {
    var index = moveListeners.indexOf(listener);
    assert(index >= 0);
    delete moveListeners[index];
  };
  function fireMoveStarted(move) {
    for(var i = 0; i < moveListeners.length; i++) {
      moveListeners[i](move, true);
    }
  }
  function fireMoveEnded(move) {
    for(var i = 0; i < moveListeners.length; i++) {
      moveListeners[i](move, false);
    }
  }

  function startMove() {
    model.moveProgress = 0;

    model.currentMoveIdx += 1;
    //log(moveToString(currentMove));
    fireMoveStarted(currentMove());
  }

  //TODO 20110906: Handle illegal moves robustly.
  function queueMoves(moves) {
    model.moveList = model.moveList.concat(moves);
    // if (model.moveList.length > 0) {
    //   startAnimation();
    // }
  }
  this.animateMoves = function(moves) {
    animationStep = 0.1;
    queueMoves(moves);
  };

  this.addMoves = function(moves) {
    queueMoves(moves);
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

  this.debug.getIndex = function() {
    return model.currentMoveIdx;
  }

  function startStats() {
    that.debug.stats = new Stats();
    that.debug.stats.domElement.style.position = 'absolute';
    that.debug.stats.domElement.style.top = '0px';
    that.debug.stats.domElement.style.left = '0px';
    view.twistyContainer.appendChild( that.debug.stats.domElement );
    $(that.debug.stats.domElement).click();
  }

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

      if (model.position > totalLength()) {
        model.position = totalLength();
        view.animating = false;
      }

      // If we finished a move, snap to the beginning of the next.
      if (Math.floor(model.position) > Math.floor(prevPosition)) {
        // TODO: Skip multpile moves.
        var prevMove = model.moveList[Math.floor(prevPosition)];
        that.twisty["animateMoveCallback"](that.twisty, prevMove, 1);
        that.twisty["advanceMoveCallback"](that.twisty, prevMove);
      }
      else {
        var currentMove = model.moveList[Math.floor(model.position)];
        // console.log("cur", currentMove);
        that.twisty["animateMoveCallback"](that.twisty, currentMove, model.position % 1);
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

  function createTwisty(twistyType) {
    var twistyCreateFunction = twistyjs.twisties[twistyType.type];
    if(!twistyCreateFunction) {
      err('that.twisty type "' + twistyType.type + '" is not recognized!');
      return null;
    }

    // TODO - discuss the class heirarchy with Lucas
    //  Does it make sense for a TwistyScene to have an addMoves method?
    //  Scene implies (potentially) multiple twisties.
    //   Perhaps rename TwistyScene -> view.TwistyContainer?
    //  Alertatively, TwistyScene could become a that.twisty base class, 
    //  and that.twisty instances inherit useful stuff like addMoves.
    //
    //  I personally prefer the first method for a couple of reasons:
    //   1. Classical inheritance in javascript is funky. This isn't a good
    //      reson to not do it, just personal preference.
    //   2. Creating a new that.twisty doesn't force recreation of the TwistyScene.
    //      Maybe this isn't an important case to optimize for, but to me
    //      it's evidence that having a persistent TwistyScene is the right
    //      way to go.
    return twistyCreateFunction(that, twistyType);
  }

  view.initialize(options);

};

})();
