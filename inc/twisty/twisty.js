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

  var moveProgress = null;
  var currentMoveIdx = -1;
  var moveList = [];
  function currentMove() {
    return moveList[currentMoveIdx];
  }

  var view = {
    camera: null,
    scene: null,
    renderer: null,
    canvas: null,
    cameraTheta: null
  }

  var twistyTypeCached;

  var stats = null;
  var mode = null;

  /* http://tauday.com/ ;-) */
  Math.TAU = Math.PI*2;

  /*
   * Initialization Methods
   */
  var twistyContainer = $('<div/>');
  twistyContainer.css('width', '100%');
  twistyContainer.css('height', '100%');
  twistyContainer = twistyContainer[0];

  this.getDomElement = function() {
    return twistyContainer;
  };
  this.getCanvas = function() {
    return view.canvas;
  };
  this.getTwisty = function() {
    return twisty;
  };

  this.initializeTwisty = function(twistyType) {
    moveList = [];
    currentMoveIdx = -1;
    moveProgress = 0;

    twistyTypeCached = twistyType;

    // We may have an animation queued up that is tied to the twistyCanvas.
    // Since we're about to destroy our twistyCanvas, that animation request
    // will never fire. Thus, we must explicitly stop animating here.
    stopAnimation();

    $(twistyContainer).empty();
    log("Canvas Size: " + $(twistyContainer).width() + " x " + $(twistyContainer).height());

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

    twistyContainer.appendChild(view.canvas);


    //TODO: figure out keybindings, shortcuts, touches, and mouse presses.
    //TODO: 20110905 bug: after pressing esc, cube dragging doesn't work.

    if(twistyType.allowDragging) {
      $(twistyContainer).css('cursor', 'move');
      twistyContainer.addEventListener( 'mousedown', onMouseDown, false );
      twistyContainer.addEventListener( 'touchstart', onTouchStart, false );
      twistyContainer.addEventListener( 'touchmove', onTouchMove, false );
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

    mode = "playback";

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
    currentMoveIdx = -1;

    updateSpeed();
  }

  this.resize = function() {
    // This function should be called after setting twistyContainer
    // to the desired size.
    var min = Math.min($(twistyContainer).width(), $(twistyContainer).height());
    view.camera = new THREE.PerspectiveCamera( 30, 1, 0.001, 1000 );

    moveCameraDelta(0);
    view.renderer.setSize(min, min);
    $(view.canvas).css('position', 'absolute');
    $(view.canvas).css('top', ($(twistyContainer).height()-min)/2);
    $(view.canvas).css('left', ($(twistyContainer).width()-min)/2);

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



  var theta = 0;
  var mouseXLast = 0;

  this.cam = function(deltaTheta) {
    theta += deltaTheta;
    moveCamera(theta);
  }

  var rotating = false;

  function onMouseDown( event ) {
    console.log(event);
    event.preventDefault();
    rotating = true;
    mouseXLast = event.clientX;
  }

  function onMouseMove( event ) {
    if (rotating) {
      mouseX = event.clientX;
      that.cam((mouseXLast - mouseX)/256);
      mouseXLast = mouseX;
    }
  }

  function onMouseUp( event ) {
    rotating = false;
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
    moveProgress = 0;

    currentMoveIdx += 1;
    //log(moveToString(currentMove));
    fireMoveStarted(currentMove());
  }

  //TODO 20110906: Handle illegal moves robustly.
  function queueMoves(moves) {
    moveList = moveList.concat(moves);
    if (moveList.length > 0) {
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
    return moveList;
  }

  var preMoves;
  var stopPlaybackSoon = false;

  this.setIndex = function(idx) {
    var moveListSaved = moveList;
    that.initializeTwisty(twistyTypeCached); // Hack
    moveList = moveListSaved;
    if (mode === "playback") {
      that.applyMoves(preMoves);
    }
    while (currentMoveIdx < idx) {
      startMove();
      twisty["advanceMoveCallback"](twisty, currentMove());
    }
    render();
  }

  this.debug = {};
  this.debug.getIndex = function() {
    return currentMoveIdx;
  }

  //TODO: Make time-based / framerate-compensating
  function updateSpeed() {
    if (mode === "playback") {
      animationStep = baseAnimationStep;
    }
    else {
      baseAnimationStep = Math.min(0.15 + 0.1*(moveList.length - currentMoveIdx-1), 1);
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
    moveProgress += stepAmount();

    if (moveProgress < 1) {
      twisty["animateMoveCallback"](twisty, currentMove(), moveProgress);
    }
    else {
      twisty["advanceMoveCallback"](twisty, currentMove());

      fireMoveEnded(currentMove());
      //currentMoveIdx = -1;

      if (currentMoveIdx + 1 >= moveList.length || stopPlaybackSoon) {
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
    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    stats.domElement.style.left = '0px';
    twistyContainer.appendChild( stats.domElement );
    $(stats.domElement).click();
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
      //log("Starting move queue: " + movesToString(moveList));
      while (moveList[currentMoveIdx+1].base === ".") {
        currentMoveIdx++; // Don't start animating on a pause.
      }
      startMove();
      pendingAnimationLoop = requestAnimFrame(animateLoop, view.canvas);
    }
  }
  function animateLoop() {
    stepAnimation();
    render();

    if (stats) {
      stats.update(); 
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
    //   Perhaps rename TwistyScene -> TwistyContainer?
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
