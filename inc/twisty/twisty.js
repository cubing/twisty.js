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

  var twisty = {
    type: null
  }

  var view = {
    camera: null,
    cameraTheta: null,
    scene: null,
    renderer: null,
    dom_container: null,
    dom_canvas: null
  }

  var animation = {
    time: 0,
    setup: null,
    alg: null
    // mode: null
  }

  var debug = {
    stats: null
  }

  /* http://tauday.com/ ;-) */
  Math.TAU = Math.PI*2;

  // this.getDomElement = function() {
  //   return twistyContainer;
  // };
  // this.getCanvas = function() {
  //   return view.dom_canvas;
  // };
  // this.getTwisty = function() {
  //   return twisty;
  // };

  this.initializeScene = function() {

    // Set up DOM container
    var dom_container = $('<div/>');
    dom_container.css('width', '100%');
    dom_container.css('height', '100%');
    view.dom_container = dom_container[0];

    var rendererType = twisty.type.renderer || THREE.CanvasRenderer;
    view.renderer = new rendererType({antialias: true});

    view.dom_container.appendChild(view.renderer.domElement);

    view.scene = new THREE.Scene();
  }

  this.initializeAnimation = function() {

  }

  this.getDomElement = function() {
    return view.dom_container;
  }


  this.initializeTwisty = function(twistyType) {

    twisty.type = twistyType;

    this.initializeScene();
    this.initializeAnimation();

    twisty = createTwisty(twistyType, view.scene);


    //TODO: figure out keybindings, shortcuts, touches, and mouse presses.
    //TODO: 20110905 bug: after pressing esc, cube dragging doesn't work.

    // if(twistyType.allowDragging) {
    //   $(twistyContainer).css('cursor', 'move');
    //   twistyContainer.addEventListener( 'mousedown', onMouseDown, false );
    //   twistyContainer.addEventListener( 'touchstart', onTouchStart, false );
    //   twistyContainer.addEventListener( 'touchmove', onTouchMove, false );
    // }


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
    view.camera = new THREE.PerspectiveCamera( 60, 1, 1, 8 );

    moveCameraDelta(0);
    view.renderer.setSize(min, min);
    $(view.dom_canvas).css('position', 'absolute');
    $(view.dom_canvas).css('top', ($(twistyContainer).height()-min)/2);
    $(view.dom_canvas).css('left', ($(twistyContainer).width()-min)/2);

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
    view.scale = twisty.cameraScale();
    view.camera.position.x = 2.5*Math.sin(theta) * view.scale;
    view.camera.position.y = 2 * view.scale;
    view.camera.position.z = 2.5*Math.cos(theta) * view.scale;
    view.camera.lookAt(new THREE.Vector3(0, -0.075 * view.scale, 0));
    view.camera.updateProjectionMatrix();
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
    debug.stats = new Stats();
    debug.stats.domElement.style.position = 'absolute';
    debug.stats.domElement.style.top = '0px';
    debug.stats.domElement.style.left = '0px';
    twistyContainer.appendChild( debug.stats.domElement );
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
      //log("Starting move queue: " + movesToString(moveList));
      while (moveList[currentMoveIdx+1].base === ".") {
        currentMoveIdx++; // Don't start animating on a pause.
      }
      startMove();
      pendingAnimationLoop = requestAnimFrame(animateLoop, view.dom_canvas);
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
      pendingAnimationLoop = requestAnimFrame(animateLoop, view.dom_canvas);
    }
  }

  function createTwisty(twistyType, scene) {
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
    return twistyCreateFunction(that, twistyType, scene);
  }

};

})();
