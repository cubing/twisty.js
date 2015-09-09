"use strict";

Twisty.Scene.WindowResizeListener = function(scene) {
  window.addEventListener('resize', this._onWindowResize.bind(this), false);
  this._scenes = [];
};

Twisty.Scene.WindowResizeListener.prototype = {
  addScene: function(scene) {
    this._scenes.push(scene);
  },

  removeScene: function(scene) {
    for (var i in this._scenes) {
      if (this._scenes[i] === scene) {
        this._scenes.splice(i, 1);
        return;
      }
    }
  },

  _onWindowResize: function() {
    for (var i in this._scenes) {
      this._scenes[i].resizeRendererToDomElement();
    }
  }
};

// Singleton. Call functions on this.
Twisty.Scene.windowResizeListener = new Twisty.Scene.WindowResizeListener();
