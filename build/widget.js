"use strict";
var FullscreenAPI;
(function (FullscreenAPI) {
    function element() {
        return document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement ||
            document.webkitFullscreenElement;
    }
    FullscreenAPI.element = element;
    function request(element) {
        var requestFullscreen = element.requestFullscreen ||
            element.mozRequestFullScreen ||
            element.msRequestFullscreen ||
            element.webkitRequestFullscreen;
        requestFullscreen.call(element);
    }
    FullscreenAPI.request = request;
    function exit() {
        var exitFullscreen = document.exitFullscreen ||
            document.mozCancelFullScreen ||
            document.msExitFullscreen ||
            document.webkitExitFullscreen;
        exitFullscreen.call(document);
    }
    FullscreenAPI.exit = exit;
})(FullscreenAPI || (FullscreenAPI = {}));
var Twisty;
(function (Twisty) {
    let Widget;
    (function (Widget) {
        class Button {
            constructor(title, initialClass) {
                this.element = document.createElement("button");
                this.element.title = title;
                // TODO: Handle updating image based on anim state.
                this.element.classList.add(initialClass);
                this.element.addEventListener("click", this.onpress.bind(this));
            }
        }
        Widget.Button = Button;
        (function (Button) {
            class Fullscreen extends Button {
                constructor(fullscreenElement) {
                    super("Full Screen", "fullscreen");
                    this.fullscreenElement = fullscreenElement;
                }
                onpress() {
                    if (FullscreenAPI.element() === this.fullscreenElement) {
                        FullscreenAPI.exit();
                    }
                    else {
                        FullscreenAPI.request(this.fullscreenElement);
                    }
                }
            }
            Button.Fullscreen = Fullscreen;
            class SkipToStart extends Button {
                constructor(anim) {
                    super("Skip To Start", "skip-to-start");
                    this.anim = anim;
                }
                onpress() { this.anim.skipToStart(); }
            }
            Button.SkipToStart = SkipToStart;
            class SkipToEnd extends Button {
                constructor(anim) {
                    super("Skip To End", "skip-to-end");
                    this.anim = anim;
                }
                onpress() { this.anim.skipToEnd(); }
            }
            Button.SkipToEnd = SkipToEnd;
            class PlayPause extends Button {
                constructor(anim) {
                    super("Play", "play");
                    this.anim = anim;
                    this.anim.dispatcher.registerDirectionObserver(this);
                }
                onpress() { this.anim.togglePausePlayForward(); }
                animDirectionChanged(direction) {
                    // TODO: Handle flash of pause button when pressed while the Twisty is already at the end.
                    var newClass = direction === Cursor.Direction.Paused ? "play" : "pause";
                    this.element.classList.remove("play", "pause");
                    this.element.classList.add(newClass);
                    this.element.title = direction === Cursor.Direction.Paused ? "Play" : "Pause";
                }
            }
            Button.PlayPause = PlayPause;
            class StepForward extends Button {
                constructor(anim) {
                    super("Step forward", "step-forward");
                    this.anim = anim;
                }
                onpress() { this.anim.stepForward(); }
            }
            Button.StepForward = StepForward;
            class StepBackward extends Button {
                constructor(anim) {
                    super("Step backward", "step-backward");
                    this.anim = anim;
                }
                onpress() { this.anim.stepBackward(); }
            }
            Button.StepBackward = StepBackward;
        })(Button = Widget.Button || (Widget.Button = {}));
        class ControlBar {
            constructor(anim, twistyElement) {
                this.anim = anim;
                this.twistyElement = twistyElement;
                this.element = document.createElement("twisty-control-bar");
                this.element.appendChild((new Button.Fullscreen(twistyElement)).element);
                this.element.appendChild((new Button.SkipToStart(anim)).element);
                this.element.appendChild((new Button.StepBackward(anim)).element);
                this.element.appendChild((new Button.PlayPause(anim)).element);
                this.element.appendChild((new Button.StepForward(anim)).element);
                this.element.appendChild((new Button.SkipToEnd(anim)).element);
            }
        }
        Widget.ControlBar = ControlBar;
        class Scrubber {
            constructor(anim) {
                this.anim = anim;
                this.element = document.createElement("input");
                this.element.classList.add("scrubber");
                this.element.type = "range";
                this.element.addEventListener("input", this.oninput.bind(this));
                var bounds = this.anim.getBounds();
                this.element.min = String(bounds[0]);
                this.element.max = String(bounds[1]);
                this.element.value = String(this.anim.cursor.currentTimestamp());
                this.anim.dispatcher.registerCursorObserver(this);
            }
            updateBackground() {
                // TODO: Figure out the most efficient way to do this.
                // TODO: Pad by the thumb radius at each end.
                var min = parseInt(this.element.min);
                var max = parseInt(this.element.max);
                var value = parseInt(this.element.value);
                var v = (value - min) / max * 100;
                this.element.style.background = `linear-gradient(to right, \
      rgb(204, 24, 30) 0%, \
      rgb(204, 24, 30) ${v}%, \
      rgba(0, 0, 0, 0.25) ${v}%, \
      rgba(0, 0, 0, 0.25) 100%\
      )`;
            }
            oninput() {
                // TODO: Ideally, we should prevent this from firing back.
                this.anim.skipAndPauseTo(parseInt(this.element.value));
                this.updateBackground();
            }
            animCursorChanged(cursor) {
                this.element.value = String(cursor.currentTimestamp());
                this.updateBackground();
            }
            animBoundsChanged() {
                // TODO
                this.updateBackground();
            }
        }
        Widget.Scrubber = Scrubber;
        class CursorTextView {
            constructor(anim) {
                this.anim = anim;
                this.element = document.createElement("cursor-text-view");
                this.element.textContent = String(this.anim.cursor.currentTimestamp());
                this.anim.dispatcher.registerCursorObserver(this);
            }
            animCursorChanged(cursor) {
                this.element.textContent = String(Math.floor(cursor.currentTimestamp()));
            }
        }
        Widget.CursorTextView = CursorTextView;
        class CursorTextMoveView {
            constructor(anim) {
                this.anim = anim;
                this.element = document.createElement("cursor-text-view");
                this.anim.dispatcher.registerCursorObserver(this);
                var durFn = new Cursor.AlgDuration(Cursor.DefaultDurationForAmount);
                this.animCursorChanged(anim.cursor);
            }
            formatFraction(k) {
                return (String(k) + (Math.floor(k) === k ? "." : "") + "000000").slice(0, 5);
            }
            animCursorChanged(cursor) {
                var pos = cursor.currentPosition();
                var s = "" + Math.floor(cursor.currentTimestamp());
                if (pos.moves.length > 0) {
                    s += " " + pos.moves[0].move.toString() + " " + this.formatFraction(pos.moves[0].fraction);
                }
                this.element.textContent = s;
            }
        }
        Widget.CursorTextMoveView = CursorTextMoveView;
        class KSolveView {
            constructor(anim, definition) {
                this.anim = anim;
                this.definition = definition;
                this.element = document.createElement("ksolve-svg-view");
                this.anim.dispatcher.registerCursorObserver(this);
                this.svg = new KSolve.SVG(definition); // TODO: Dynamic puzzle
                this.element.appendChild(this.svg.element);
            }
            animCursorChanged(cursor) {
                var pos = cursor.currentPosition();
                if (pos.moves.length > 0) {
                    var move = pos.moves[0].move;
                    var def = this.definition;
                    var newState = KSolve.Combine(def, pos.state, KSolve.Multiply(def, def.moves[move.base], move.amount * pos.moves[0].direction));
                    this.svg.draw(this.definition, pos.state, newState, pos.moves[0].fraction);
                }
                else {
                    this.svg.draw(this.definition, pos.state);
                }
            }
        }
        Widget.KSolveView = KSolveView;
        class Player {
            constructor(anim, definition) {
                this.anim = anim;
                this.element = document.createElement("player");
                this.element.appendChild((new KSolveView(this.anim, definition)).element);
                this.element.appendChild((new Scrubber(this.anim)).element);
                this.element.appendChild((new ControlBar(this.anim, this.element)).element);
                this.element.appendChild((new CursorTextMoveView(this.anim)).element);
            }
        }
        Widget.Player = Player;
    })(Widget = Twisty.Widget || (Twisty.Widget = {}));
})(Twisty || (Twisty = {}));
//# sourceMappingURL=widget.js.map