/*
 * twisty.js
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

if(typeof(log) == "undefined") {
  var log = function(s) {
    console.log(s);
  };
}

/****************
 * 
 * Twisty Plugins
 *
 * Plugins register themselves by calling twistyjs.registerTwisty.
 * This lets plugins be defined in different files.
 * 
 */

var twisties = {};
twistyjs.registerTwisty = function(twistyName, twistyConstructor) {
  assert(!(twistyName in twisties));
  twisties[twistyName] = twistyConstructor;
};

twistyjs.TwistyScene = function() {
  // that=this is a Crockford convention for accessing "this" inside of methods.
  var that = this;

  var twisty = null;

  var model = {
    moveProgress: null,
    currentMoveIdx: -1,
    moveList: [],
    twistyType: null,
    mode: null
  }

  var view = {
    camera: null,
    scene: null,
    renderer: null,
    canvas: null,
    container: null,
    cameraTheta: null,
    theta: null,
    rotating: false
  }

  var debug = {
    status: null
  }

  /* http://tauday.com/ ;-) */
  Math.TAU = Math.PI*2;

  function currentMove() {
    return model.moveList[model.currentMoveIdx];
  }

  /*
   * Initialization Methods
   */
  view.twistyContainer = $('<div/>');
  view.twistyContainer.css('width', '100%');
  view.twistyContainer.css('height', '100%');
  view.twistyContainer = view.twistyContainer[0];

  this.getDomElement = function() {
    return view.twistyContainer;
  };
  this.getCanvas = function() {
    return view.canvas;
  };
  this.getTwisty = function() {
    return twisty;
  };

  this.initializeTwisty = function(twistyType) {
    model.moveList = [];
    model.currentMoveIdx = -1;
    model.moveProgress = 0;

    model.twistyType = twistyType;

    // We may have an animation queued up that is tied to the twistyCanvas.
    // Since we're about to destroy our twistyCanvas, that animation request
    // will never fire. Thus, we must explicitly stop animating here.
    stopAnimation();

    $(view.twistyContainer).empty();
    log("Canvas Size: " + $(view.twistyContainer).width() + " x " + $(view.twistyContainer).height());

    /*
     * Scene Setup
     */

    view.scene = new THREE.Scene();

    /*
     * 3D Object Creation
     */

    // TODO: Rename and spec twisty format.
    twisty = createTwisty(twistyType);
    view.scene.add(twisty["3d"]);

    /*
     * Go!
     */

    var rendererType = twistyType.renderer || THREE.CanvasRenderer; // TODO: Standardize option handling in this function.
    view.renderer = new rendererType({antialias: true});
    view.canvas = view.renderer.domElement;

    view.twistyContainer.appendChild(view.canvas);


    //TODO: figure out keybindings, shortcuts, touches, and mouse presses.
    //TODO: 20110905 bug: after pressing esc, cube dragging doesn't work.

    if(twistyType.allowDragging) {
      $(view.twistyContainer).css('cursor', 'move');
      view.twistyContainer.addEventListener( 'mousedown', onMouseDown, false );
      view.twistyContainer.addEventListener( 'touchstart', onTouchStart, false );
      view.twistyContainer.addEventListener( 'touchmove', onTouchMove, false );
    }

    var mode = null;


    if(twistyType.showFps) {
      startStats();
    }

    if (typeof(that.speed) === "undefined") {
      that.speed = twistyType.speed || 1;
    }

    // resize creates the camera and calls render()
    that.resize();
  }

  this.setupAnimation = function(algIn, opts) {
    opts = opts || {};
    opts.init = (typeof opts.init === "undefined") ? [] : opts.init;
    if (opts.type !== "solve") { opts.type = "generator"; }

    console.log("---");
    console.log(opts.init);
    console.log(opts.type);

    model.mode = "playback";

    that.applyMoves(opts.init);
    preMoves = opts.init;

    if (opts.type === "solve") {
      console.log("alg", algIn);
      var algInverse = alg.sign_w.invert(algIn);
      console.log("alg", algInverse);
      that.applyMoves(algInverse);
      preMoves = preMoves.concat(algInverse);
      render();
    }

    that.addMoves(algIn);
    stopAnimation();
    model.currentMoveIdx = -1;

    updateSpeed();
  }

  this.resize = function() {
    // This function should be called after setting view.twistyContainer
    // to the desired size.
    var min = Math.min($(view.twistyContainer).width(), $(view.twistyContainer).height());
    view.camera = new THREE.PerspectiveCamera( 30, 1, 0.001, 1000 );

    moveCameraDelta(0);
    view.renderer.setSize(min, min);
    $(view.canvas).css('position', 'absolute');
    $(view.canvas).css('top', ($(view.twistyContainer).height()-min)/2);
    $(view.canvas).css('left', ($(view.twistyContainer).width()-min)/2);

    render();
  };

  this.keydown = function(e) {
    var keyCode = e.keyCode;
    //log(keyCode);
    twisty.keydownCallback(twisty, e);

    switch (keyCode) {

      case 37:
        moveCameraDelta(Math.TAU/48);
        e.preventDefault();
        break;

      case 39:
        moveCameraDelta(-Math.TAU/48);
        e.preventDefault();
        break;

    }
  };


  this.cam = function(deltaTheta) {
    view.theta += deltaTheta;
    moveCamera(view.theta);
  }

  function onMouseDown( event ) {
    console.log(event);
    event.preventDefault();
    view.rotating = true;
    view.mouseXLast = event.clientX;
  }

  function onMouseMove( event ) {
    if (view.rotating) {
      view.mouseX = event.clientX;
      that.cam((view.mouseXLast - view.mouseX)/256);
      view.mouseXLast = view.mouseX;
    }
  }

  function onMouseUp( event ) {
    view.rotating = false;
  }

  document.body.addEventListener( 'mousemove', onMouseMove, false );
  document.body.addEventListener( 'mouseup', onMouseUp, false );

  function onTouchStart( event ) {
    if ( event.touches.length == 1 ) {
      event.preventDefault();
      mouseXLast = event.touches[0].pageX;
    }
  }

  function onTouchMove( event ) {
    if ( event.touches.length == 1 ) {
      event.preventDefault();
      mouseX = event.touches[0].pageX;
      that.cam((mouseXLast - mouseX)/256);
      mouseXLast = mouseX;
    }
  }



  function render() {
    view.renderer.render(view.scene, view.camera);
  }

  function moveCameraPure(theta) {
    view.cameraTheta = theta;
    var scale = twisty.cameraScale();
    view.camera.position.x = 2.5*Math.sin(theta) * scale;
    view.camera.position.y = 2 * scale;
    view.camera.position.z = 2.5*Math.cos(theta) * scale;
    view.camera.lookAt(new THREE.Vector3(0, -0.075 * scale, 0));
  }

  function moveCameraDelta(deltaTheta) {
    view.cameraTheta += deltaTheta;
    moveCameraPure(view.cameraTheta);
    render();
  }

  function moveCamera(theta) {
    moveCameraPure(theta);
    render();
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
    if (model.moveList.length > 0) {
      startAnimation();
    }
  }
  this.animateMoves = function(moves) {
    animationStep = 0.1;
    queueMoves(moves);
  };

  this.addMoves = function(moves) {
    queueMoves(moves);
    updateSpeed();
  };

  this.stopAnimation = stopAnimation;
  this.startAnimation = startAnimation;

  this.applyMoves = function(moves) {
    for (i in moves) {
      twisty["advanceMoveCallback"](twisty, moves[i]);
    }
    render();
  };

  this.getMoveList = function() {
    return model.moveList;
  }

  var preMoves;
  var stopPlaybackSoon = false;

  this.setIndex = function(idx) {
    var moveListSaved = model.moveList;
    that.initializeTwisty(model.twistyType); // Hack
    model.moveList = moveListSaved;
    if (model.mode === "playback") {
      that.applyMoves(preMoves);
    }
    while (model.currentMoveIdx < idx) {
      startMove();
      twisty["advanceMoveCallback"](twisty, currentMove());
    }
    render();
  }

  this.debug = {};
  this.debug.getIndex = function() {
    return model.currentMoveIdx;
  }

  //TODO: Make time-based / framerate-compensating
  function updateSpeed() {
    if (model.mode === "playback") {
      animationStep = baseAnimationStep;
    }
    else {
      baseAnimationStep = Math.min(0.15 + 0.1*(model.moveList.length - model.currentMoveIdx-1), 1);
    }

  }

  this.setSpeed = function(speed) {
    that.speed = speed;
  }

  function stepAmount() {
    var factor = 3; // Tuned constant; equals the maximum ratio of a long move vs. a quarter turn.
    var currentAmount = Math.abs(currentMove().amount);
    return baseAnimationStep * currentAmount / (1 + (factor*(currentAmount - 1))) * that.speed;
  }

  var baseAnimationStep = 0.1;
  var animationStep = baseAnimationStep;

  function stepAnimation() {
    model.moveProgress += stepAmount();

    if (model.moveProgress < 1) {
      twisty["animateMoveCallback"](twisty, currentMove(), model.moveProgress);
    }
    else {
      twisty["advanceMoveCallback"](twisty, currentMove());

      fireMoveEnded(currentMove());
      //model.currentMoveIdx = -1;

      if (model.currentMoveIdx + 1 >= model.moveList.length || stopPlaybackSoon) {
        stopAnimation();
      }
      else {
        startMove();
      }

    }
  }

  this.stopPlayback = function() {
    stopPlaybackSoon = true;
  }

  function startStats() {
    debug.stats = new Stats();
    debug.stats.domElement.style.position = 'absolute';
    debug.stats.domElement.style.top = '0px';
    debug.stats.domElement.style.left = '0px';
    view.twistyContainer.appendChild( debug.stats.domElement );
    $(debug.stats.domElement).click();
  }


  var pendingAnimationLoop = null;
  function stopAnimation() {
    if(pendingAnimationLoop !== null) {
      cancelRequestAnimFrame(pendingAnimationLoop);
      pendingAnimationLoop = null;
    }
  }
  function startAnimation() {
    stopPlaybackSoon = false;
    if(pendingAnimationLoop === null) {
      //log("Starting move queue: " + movesToString(model.moveList));
      while (model.moveList[model.currentMoveIdx+1].base === ".") {
        model.currentMoveIdx++; // Don't start animating on a pause.
      }
      startMove();
      pendingAnimationLoop = requestAnimFrame(animateLoop, view.canvas);
    }
  }
  function animateLoop() {
    stepAnimation();
    render();

    if (debug.stats) {
      debug.stats.update(); 
    }

    // That was fun, lets do it again!
    // We check pendingAnimationLoop first, because the loop
    // may have been cancelled during stepAnimation().
    if(pendingAnimationLoop !== null) {
      pendingAnimationLoop = requestAnimFrame(animateLoop, view.canvas);
    }
  }

  function createTwisty(twistyType) {
    var twistyCreateFunction = twisties[twistyType.type];
    if(!twistyCreateFunction) {
      err('Twisty type "' + twistyType.type + '" is not recognized!');
      return null;
    }

    // TODO - discuss the class heirarchy with Lucas
    //  Does it make sense for a TwistyScene to have an addMoves method?
    //  Scene implies (potentially) multiple twisties.
    //   Perhaps rename TwistyScene -> view.TwistyContainer?
    //  Alertatively, TwistyScene could become a Twisty base class, 
    //  and twisty instances inherit useful stuff like addMoves.
    //
    //  I personally prefer the first method for a couple of reasons:
    //   1. Classical inheritance in javascript is funky. This isn't a good
    //      reson to not do it, just personal preference.
    //   2. Creating a new twisty doesn't force recreation of the TwistyScene.
    //      Maybe this isn't an important case to optimize for, but to me
    //      it's evidence that having a persistent TwistyScene is the right
    //      way to go.
    return twistyCreateFunction(that, twistyType);
  }

};

})();
