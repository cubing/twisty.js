var aaa, bbb;

/*
 * model.twisty.js
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

var twisty = {};

(function() {

/****************
 *
 * twisty.js Plugins
 *
 * Plugins register themselves by calling twisty.registerTwisty.
 * This lets plugins be defined in different files.
 *
 */

twisty.puzzles = {};

twisty.scene = function(options) {

  // that=this is a Crockford convention for accessing "this" inside of methods.
  var that = this;


  /******** Constants ********/

  var CONSTANTS = {
    CAMERA_HEIGHT_STICKY_MIN: 2,
    CAMERA_HEIGHT_STICKY_MAX: 4,
    DRAG_RESISTANCE_X: 256,
    DRAG_RESISTANCE_Y: 60,
    SCROLL_RESISTANCE_X: 1024,
    SCROLL_RESISTANCE_Y: 180
  }


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
    cameraHeight: CONSTANTS.CAMERA_HEIGHT_STICKY_MAX,

    mouseXLast: null,
    mouseYLast: null,

    listeners: {
      animating: [],
      position: [],
      moveStart: [],
      moveAdvance: []
    },

    startSector: null,
    lastSector: null,

    speed: null,

    animating: false,
    stopAfterNextMove: false
  }

  this.debug = {
    stats: null,
    model: model,
    view: view,
    control: control
  }


  /******** General Initialization ********/


  var iniDefaults = {
    speed: 1, // qtps is 3*speed
    renderer: THREE.CanvasRenderer,
    allowDragging: true,
    touchMoveInput: false,
    stats: false
  }

  function initialize(options) {
    options = getOptions(options, iniDefaults);

    view.initialize(options.renderer);

    control.speed = options.speed;
    that.initializeTouchOrDragEvents();
    if (options.stats) { startStats(); }
  }



  /******** Model: Initialization ********/


  this.initializePuzzle = function(twistyType) {

    model.position = 0;
    model.preMoveList = [];
    model.moveList = [];

    model.twisty = createTwisty(twistyType);
    view.scene.add(model.twisty["3d"]);

    that.resize();
  }

  this.resize = function() {
    var width = $(view.container).width();
    var height = $(view.container).height()
    var min = Math.min(width, height);
    view.camera.setViewOffset(min,  min, (min - width)/2, (min - height)/2, width, height);

    moveCameraDelta(0, 0);
    view.renderer.setSize(width, height);
    renderOnce();

    drawSectors();
  };


  /******** View: Initialization ********/

  view.initialize = function(Renderer) {
    view.scene = new THREE.Scene();
    view.camera = new THREE.PerspectiveCamera( 30, 1, 0.001, 1000 );

    view.renderer = new Renderer({
      antialias: true,
      alpha: true,
      // TODO: We're using this so we can save pictures of WebGL canvases.
      // Investigate if there's a significant performance penalty.
      // Better yet, allow rendering to a CanvasRenderer view separately.
      preserveDrawingBuffer: true
    });

    var canvas = view.renderer.domElement;
    $(canvas).css('position', 'absolute').css('top', 0).css('left', 0);

    var container = $('<div/>').css('width', '100%').css('height', '100%');
    view.container = container[0];
    container.append(canvas);
  }


  /******** View: Rendering ********/

  function render() {
    view.renderer.render(view.scene, view.camera);
    if (that.debug.stats) {
      that.debug.stats.update();
    }
  }

  function renderOnce() {
    if (!control.animating) {
      requestAnimFrame(render);
    }
  }

  this.redraw = renderOnce;


  /******** View: Camera ********/


  this.setCameraPosition = function(theta, height) {
    control.cameraTheta = theta;

    if (typeof height !== "undefined") {
      control.cameraHeight = Math.max(-CONSTANTS.CAMERA_HEIGHT_STICKY_MAX, Math.min(CONSTANTS.CAMERA_HEIGHT_STICKY_MAX, height));
    }

    // We allow the height to enter a buffer from 2 to 3, but clip the display at 2.
    var actualHeight = Math.max(-CONSTANTS.CAMERA_HEIGHT_STICKY_MIN, Math.min(CONSTANTS.CAMERA_HEIGHT_STICKY_MIN, control.cameraHeight));

    var scale = model.twisty.cameraScale() + 1 - Math.pow(Math.abs(actualHeight)/CONSTANTS.CAMERA_HEIGHT_STICKY_MIN, 2);

    view.camera.position.x = 2.5*Math.sin(theta) * scale;
    view.camera.position.y = actualHeight * scale;
    view.camera.position.z = 2.5*Math.cos(theta) * scale;
    view.camera.lookAt(new THREE.Vector3(0, -0.075 * scale * (actualHeight)/CONSTANTS.CAMERA_HEIGHT_STICKY_MIN, 0));
  }

  function moveCameraDelta(deltaTheta, deltaHeight) {
    that.setCameraPosition(control.cameraTheta + deltaTheta, control.cameraHeight + deltaHeight);
  }

  // Detect modern versions of IE.
  // I try to write browser-agnostic code, but even IE11 manages to break the wheel event.
  var isIE = navigator.userAgent.indexOf('Trident') > -1;

  /******** Control: Mouse/Touch Dragging ********/

  this.initializeTouchOrDragEvents = function() {

    if (options.allowDragging || options.touchMoveInput) {
      $(view.container).css("cursor", "move");
      view.container.addEventListener("mousedown", onStart, false );
      view.container.addEventListener("touchstart", onStart, false );
      if (!isIE) {
        view.container.addEventListener("wheel", onWheel, false );
      }
    }
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

  function touchMark(x, y, color) {

    var dims = sectorDimensions();

    var divDims = {};

         if (y < dims.y1) { divDims.top = dims.top; divDims.bottom = dims.y1; }
    else if (y > dims.y2) { divDims.top = dims.y2;  divDims.bottom = dims.top + dims.height; }
    else                  { divDims.top = dims.y1;  divDims.bottom = dims.y2; }

         if (x < dims.x1) { divDims.left = dims.left; divDims.right = dims.x1; }
    else if (x > dims.x2) { divDims.left = dims.x2;   divDims.right = dims.left + dims.width; }
    else                  { divDims.left = dims.x1;   divDims.right = dims.x2; }


    var radius = Math.min($(view.container).width(), $(view.container).height()) / 8;
    var d = $("<div>").appendTo("#twistyContainer");
    d.addClass("touchMark");
    d.addClass("move");
    d.css({
      display: "flex",
      position: "fixed",
      width: divDims.right - divDims.left,
      height: divDims.bottom - divDims.top,
      background: color,
      color: "white",
      "text-align": "center",
      "align-items": "center",
      "font-size": radius * 1.5,
      opacity: "0.85",
      "pointer-events": "none",
      "font-family": "Tahoma, Verdana"
    });
    d.offset({left: divDims.left, top: divDims.top});
    return d;
  }

  function highlightCurrentSector(x, y) {

    var sector = getSector(control.mouseXLast, control.mouseYLast);

    if (sector !== control.lastSector) {
      $(".sectorHighlights").remove();

      var sectorMove = control.startSector + " -> " + sector;

      var d = touchMark(control.mouseXLast, control.mouseYLast, "#444");
      d.addClass("sectorHighlights");

      if (sectorMove in sectorMoveMap) {
        var moveString = sectorMoveMap[sectorMove];
        d.append($("<span>").html(moveString).css({
          "text-align": "center",
          width: "100%"
        }));
      }
      else {
        d.css("background", "#FAA");
      }

      control.lastSector = sector;
    }

    return sector;
  }

  function sectorDimensions() {
    var dims = {};

    var p = $(view.container).position();
    dims.top = p.top;
    dims.left = p.left;
    dims.height = $(view.container).height();
    dims.width = $(view.container).width();

    dims.vCenter = dims.top + dims.height / 2;
    dims.hCenter = dims.left + dims.width / 2;

    dims.centerSize = Math.min(dims.height, dims.width) / 3;

    dims.y1 = dims.vCenter - dims.centerSize / 2;
    dims.y2 = dims.vCenter + dims.centerSize / 2;
    dims.x1 = dims.hCenter - dims.centerSize / 2;
    dims.x2 = dims.hCenter + dims.centerSize / 2;

    return dims;
  }

  function drawSectors() {

    $(".sectorMark").remove();

    var dims = sectorDimensions();

    function d() {
      var d = $("<div>").appendTo(view.container);
      d.addClass("sectorMark");
      d.css({
        position: "fixed",
        border: "#000 1px solid",
        "pointer-events": "none",
        opacity: 0.2,
        "z-index": 100
      });
      return d;
    }
    d().width(0).height(dims.height).offset({left: dims.x1,   top: dims.top});
    d().width(0).height(dims.height).offset({left: dims.x2,   top: dims.top});
    d().width(dims.width).height(0).offset( {left: dims.left, top: dims.y1 });
    d().width(dims.width).height(0).offset( {left: dims.left, top: dims.y2 });

  }

  function getSector(x, y) {

    var sector = "";
    var dims = sectorDimensions();

         if (y < dims.y1) { sector += "U"; }
    else if (y > dims.y2) { sector += "D"; }
    else                  { sector += "E"; }

         if (x < dims.x1) { sector += "L"; }
    else if (x > dims.x2) { sector += "R"; }
    else                  { sector += "M"; }

    return sector;
  }

  function onStart(event) {
    var kind = eventKind(event);

    // Ignore multi-finger touches (e.g. pinch to zoom).
    if (kind !== "touch" || event.touches.length === 1) {

      control.mouseXLast = (kind == "mouse") ? event.clientX : event.touches[0].pageX;
      control.mouseYLast = (kind == "mouse") ? event.clientY : event.touches[0].pageY;

      if (options.touchMoveInput) {
        touchMark(control.mouseXLast, control.mouseYLast, "gray");
        control.startSector = getSector(control.mouseXLast, control.mouseYLast);
        control.lastSector = control.startSector;
      }

      renderOnce();
      event.preventDefault();

      for (listener in listeners[kind]) {
        window.addEventListener(listener, listeners[kind][listener], false);
      }
    }
  }

  function onMove(event) {
    var kind = eventKind(event);

    var mouseX = (kind == "mouse") ? event.clientX : event.touches[0].pageX;
    var mouseY = (kind == "mouse") ? event.clientY : event.touches[0].pageY;

    if (options.allowDragging) {
      var deltaX = (control.mouseXLast - mouseX)/CONSTANTS.DRAG_RESISTANCE_X;
      var deltaY = -(control.mouseYLast - mouseY)/CONSTANTS.DRAG_RESISTANCE_Y;

      moveCameraDelta(deltaX, deltaY);

      renderOnce();
      event.preventDefault();
    }

    control.mouseXLast = mouseX;
    control.mouseYLast = mouseY;

    highlightCurrentSector();
  }

  function onWheel(event) {
    var deltaX = -event.wheelDeltaX/CONSTANTS.SCROLL_RESISTANCE_X;
    var deltaY = event.wheelDeltaY/CONSTANTS.SCROLL_RESISTANCE_Y;

    moveCameraDelta(deltaX, deltaY);

    renderOnce();
    event.preventDefault();
  }

  var sectorMoveMap = {};

  (function() {
    function addMoveMap(moveString, l) {
        sectorMoveMap[l[0] + " -> " + l[1]] = moveString;
        sectorMoveMap[l[1] + " -> " + l[0]] = moveString + "'";
        if (l.length == 3) {
          sectorMoveMap[l[1] + " -> " + l[2]] = moveString;
          sectorMoveMap[l[2] + " -> " + l[1]] = moveString + "'";

          sectorMoveMap[l[0] + " -> " + l[2]] = moveString;
          sectorMoveMap[l[2] + " -> " + l[0]] = moveString + "'";
        }
    }

    addMoveMap("R" , ["DR", "ER", "UR"]);
    addMoveMap("U" , ["UR", "UM", "UL"]);
    addMoveMap("L" , ["UL", "EL", "DL"]);
    addMoveMap("D" , ["DL", "DM", "DR"]);
    addMoveMap("F" , ["UL", "EM", "DR"]);
    addMoveMap("F" , ["DL", "EM", "UR"]);
    addMoveMap("F" , ["EL", "UM", "ER"/*, "DM", "EL"*/]);
    addMoveMap("u" , ["ER", "UL"]);
    addMoveMap("u" , ["UR", "EL"]);
    addMoveMap("B" , ["DR", "UM", "DL"]);
    addMoveMap("y" , ["ER", "EM", "EL"]);
    addMoveMap("x" , ["DM", "EM", "UM"]);
  })();

  function onEnd(event) {
    var kind = eventKind(event);

    // Snap camera height to end of sticky region.
    if (control.cameraHeight >= CONSTANTS.CAMERA_HEIGHT_STICKY_MIN) {
      control.cameraHeight = CONSTANTS.CAMERA_HEIGHT_STICKY_MAX;
    }
    else if (control.cameraHeight <= -CONSTANTS.CAMERA_HEIGHT_STICKY_MIN) {
      control.cameraHeight = -CONSTANTS.CAMERA_HEIGHT_STICKY_MAX;
    }

    for (listener in listeners[kind]) {
      window.removeEventListener(listener, listeners[kind][listener], false);
    }


    if (options.touchMoveInput) {
      var endSector = highlightCurrentSector(control.mouseXLast, control.mouseYLast);
      $(".touchMark").fadeOut(1000, function(){$(this).remove();}); // Also fades out the starting touch mark


      var sectorMove = control.startSector + " -> " + endSector;
      if (sectorMove in sectorMoveMap) {
        var moveString = sectorMoveMap[sectorMove];
        console.log("[" + sectorMove + "] " + moveString);

        var move = alg.cube.stringToAlg(moveString);
        that.queueMoves(move);
        that.play.start();
      }
      else {
        console.log("[" + sectorMove + "] not a move");
      }
    }
  }


  /******** Control: Keyboard ********/

  this.keydown = function(e) {

    var keyCode = e.keyCode;
    var move = model.twisty.keydownCallback(model.twisty, e);
    if (move != null) {
      fireListener("moveStart", move);
    }

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

  this.addListener = function(kind, listener) {
    control.listeners[kind].push(listener);
  };

  this.removeListener = function(kind, listener) {
    var index = control.listeners[kind].indexOf(listener);
    assert(index >= 0);
    delete control.listeners[kind][index];
  };

  function fireListener(kind, data) {
    for(var i = 0; i < control.listeners[kind].length; i++) {
      control.listeners[kind][i](data);
    }
  }

  // function fireMoveStarted(move) {
  //   for(var i = 0; i < control.listeners.length; i++) {
  //     control.listeners[i](move, true);
  //   }
  // }
  // function fireMoveEnded(move) {
  //   for(var i = 0; i < control.listeners.length; i++) {
  //     control.listeners[i](move, false);
  //   }
  // }


  /******** Control: Animation ********/

  function triggerAnimation() {
    if (!control.animating) {
      model.time = Date.now();
      setAnimating(true);
      animFrame();
    }
  }

  function animFrame() {

    if (model.position >= totalLength()) {
      model.position = totalLength();
      setAnimating(false);
    }

    if (control.animating) {

      var prevTime = model.time;
      var prevPosition = model.position;

      model.time = Date.now();
      model.position = prevPosition + (model.time - prevTime) * control.speed * 3 / 1000;

      if (Math.floor(model.position) > Math.floor(prevPosition)) {
        // If we finished a move, snap to the beginning of the next. (Will never skip a move.)
        model.position = Math.floor(prevPosition) + 1;
        var prevMove = model.moveList[Math.floor(prevPosition)];
        model.twisty["animateMoveCallback"](model.twisty, prevMove, 1);
        model.twisty["advanceMoveCallback"](model.twisty, prevMove);
        fireListener("moveAdvance");

        if (control.stopAfterNextMove) {
          control.stopAfterNextMove = false;
          setAnimating(false);
        }
      }
      else {
        var currentMove = model.moveList[Math.floor(model.position)];
        model.twisty["animateMoveCallback"](model.twisty, currentMove, model.position % 1);
      }
    }

    render();
    fireListener("position", model.position);

    if (control.animating) {
      requestAnimFrame(animFrame);
    }
  }

  function totalLength() {
    return model.moveList.length;
  }

  function setAnimating(value) {
    control.animating = value;
    fireListener("animating", control.animating);
  }


  /******** Control: Playback ********/

  var setupDefaults = {
    init: [],
    type: "generator"
  }

  this.setupAnimation = function(algIn, options) {
    options = getOptions(options, setupDefaults);

    setAnimating(false);

    model.preMoveList = options.init;
    if (options.type === "solve") {
      var algInverse = alg.cube.invert(algIn);
      model.preMoveList = model.preMoveList.concat(algInverse);
    }
    that.applyMoves(model.preMoveList);

    that.queueMoves(algIn);
    renderOnce();
  }

  this.applyMoves = function(moves) {
    for (i in moves) {
      model.twisty["advanceMoveCallback"](model.twisty, moves[i]);
    }
  };

  this.queueMoves = function(moves) {
    model.moveList = model.moveList.concat(moves);
  };

  this.play = {}

  this.play.reset = function() {
    setAnimating(false);
    that.setIndex(0);
  }

  this.play.start = function() {
    triggerAnimation();
  }

  this.play.pause = function() {
    setAnimating(false);
  }

  this.play.skip = function() {
    setAnimating(false);
    that.setIndex(model.moveList.length);
  }

  this.play.forward = function() {
    triggerAnimation();
    control.stopAfterNextMove = true;
  }

  this.play.back = function() {
    var index = Math.ceil(that.getPosition());
    if (index > 0) {
      that.setIndex(index - 1);
    }
  }

  this.setPosition = function(position) {

    // If we're somewhere on the same move, don't recalculate position.
    // Else, recalculate from the beginning, since we don't have something clever yet.
    if (Math.floor(position) !== that.getIndex()) {
      var preMoveListSaved = model.preMoveList;
      var moveListSaved = model.moveList;

      // Hack
      view.scene.remove(model.twisty["3d"]);
      that.initializePuzzle(model.twisty.type);
      model.preMoveList = preMoveListSaved;
      model.moveList = moveListSaved;

      that.applyMoves(model.preMoveList);
      that.applyMoves(model.moveList.slice(0, position)); // Works with fractional positions
    }

    model.position = position;

    if (position < totalLength()) {
      var currentMove = model.moveList[Math.floor(model.position)];
      model.twisty["animateMoveCallback"](model.twisty, currentMove, model.position % 1);
    }

    renderOnce();
    // fireAnimation();
  }

  this.getPosition = function() {
    return model.position;
  }

  this.getIndex = function() {
    return Math.floor(model.position);
  }

  this.setIndex = function(idx) {
    this.setPosition(Math.floor(idx));
  }


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
    var twistyCreateFunction = twisty.puzzles[twistyType.type];
    if(!twistyCreateFunction) {
      err('model.twisty type "' + twistyType.type + '" is not recognized!');
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
