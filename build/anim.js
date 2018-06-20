import { Cursor } from "./cursor";
"use strict";
var Twisty;
(function (Twisty) {
    let Anim;
    (function (Anim) {
        // export interface BoundsObserver {
        //   animBoundsChanged: (start: Timeline.Duration, end: Timeline.Duration) => void;
        // }
        // TODO: Use generics to unify handling the types of observers.
        class Dispatcher {
            constructor() {
                this.cursorObservers = new Set();
                this.directionObservers = new Set();
            }
            registerCursorObserver(observer) {
                if (this.cursorObservers.has(observer)) {
                    throw "Duplicate cursor observer added.";
                }
                this.cursorObservers.add(observer);
            }
            registerDirectionObserver(observer) {
                if (this.directionObservers.has(observer)) {
                    throw "Duplicate direction observer added.";
                }
                this.directionObservers.add(observer);
            }
            animCursorChanged(cursor) {
                // TODO: guard against nested changes and test.
                for (var observer of this.cursorObservers) {
                    observer.animCursorChanged(cursor);
                }
            }
            animDirectionChanged(direction) {
                // TODO: guard against nested changes and test.
                for (var observer of this.directionObservers) {
                    observer.animDirectionChanged(direction);
                }
            }
        }
        Anim.Dispatcher = Dispatcher;
        class Model {
            // TODO: cache breakpoints instead of re-querying the model constantly.
            constructor(cursor) {
                this.cursor = cursor;
                this.lastCursorTime = 0;
                this.direction = Cursor.Direction.Paused;
                this.breakpointType = Cursor.BreakpointType.EntireMoveSequence;
                this.tempo = 1.5; // TODO: Support setting tempo.
                this.dispatcher = new Dispatcher();
                this.scheduler = new FrameScheduler(this.frame.bind(this));
            }
            // public getCursor(): Timeline.Duration {
            //   return this.cursor;
            // }
            getBounds() {
                return [
                    this.cursor.startOfAlg(),
                    this.cursor.endOfAlg()
                ];
            }
            timeScaling() {
                return this.direction * this.tempo;
            }
            // Update the cursor based on the time since lastCursorTime, and reset
            // lastCursorTime.
            updateCursor(timestamp) {
                if (this.direction === Cursor.Direction.Paused) {
                    this.lastCursorTime = timestamp;
                    return;
                }
                // var previousCursor = this.cursor;
                var elapsed = timestamp - this.lastCursorTime;
                this.lastCursorTime = timestamp;
                // Workaround for the first frame: https://twitter.com/lgarron/status/794846097445269504
                if (elapsed < 0) {
                    elapsed = 0;
                }
                var reachedMoveBreakpoint = this.cursor.delta(elapsed * this.timeScaling(), this.breakpointType === Cursor.BreakpointType.Move);
                if (reachedMoveBreakpoint) {
                    this.setDirection(Cursor.Direction.Paused);
                    this.scheduler.stop();
                }
            }
            setDirection(direction) {
                // TODO: Handle in frame for debouncing?
                // (Are there any use cases that need synchoronous observation?)
                this.direction = direction;
                this.dispatcher.animDirectionChanged(direction);
            }
            frame(timestamp) {
                this.updateCursor(timestamp);
                this.dispatcher.animCursorChanged(this.cursor);
            }
            // TODO: Push this into timeline.
            setBreakpointType(breakpointType) {
                this.breakpointType = breakpointType;
            }
            isPaused() {
                return this.direction === Cursor.Direction.Paused;
            }
            // Animate or pause in the given direction.
            // Idempotent.
            animateDirection(direction) {
                if (this.direction === direction) {
                    return;
                }
                // Update cursor based on previous direction.
                this.updateCursor(performance.now());
                // Start the new direction.
                this.setDirection(direction);
                if (direction === Cursor.Direction.Paused) {
                    this.scheduler.stop();
                }
                else {
                    this.scheduler.start();
                }
            }
            skipAndPauseTo(duration) {
                this.pause();
                this.cursor.setPositionToStart();
                this.cursor.forward(duration, false); // TODO
                this.scheduler.singleFrame();
            }
            playForward() {
                this.setBreakpointType(Cursor.BreakpointType.EntireMoveSequence);
                this.animateDirection(Cursor.Direction.Forwards);
            }
            // A simple wrapper for animateDirection(Paused).
            pause() {
                this.animateDirection(Cursor.Direction.Paused);
            }
            playBackward() {
                this.setBreakpointType(Cursor.BreakpointType.EntireMoveSequence);
                this.animateDirection(Cursor.Direction.Backwards);
            }
            skipToStart() {
                this.skipAndPauseTo(this.cursor.startOfAlg());
            }
            skipToEnd() {
                this.skipAndPauseTo(this.cursor.endOfAlg());
            }
            stepForward() {
                this.cursor.forward(0.1, false); // TODO
                this.setBreakpointType(Cursor.BreakpointType.Move);
                this.animateDirection(Cursor.Direction.Forwards);
            }
            stepBackward() {
                this.cursor.backward(0.1, false); // TODO
                this.setBreakpointType(Cursor.BreakpointType.Move);
                this.animateDirection(Cursor.Direction.Backwards);
            }
            togglePausePlayForward() {
                if (this.isPaused()) {
                    this.playForward();
                }
                else {
                    this.pause();
                }
            }
        }
        Anim.Model = Model;
        class FrameScheduler {
            constructor(callback) {
                this.callback = callback;
                this.animating = false;
            }
            animFrame(timestamp) {
                this.callback(timestamp);
                if (this.animating) {
                    // TODO: use same bound frame instead of creating a new binding each frame.
                    requestAnimationFrame(this.animFrame.bind(this));
                }
            }
            // Start scheduling frames if not already running.
            // Idempotent.
            start() {
                if (!this.animating) {
                    this.animating = true;
                    requestAnimationFrame(this.animFrame.bind(this));
                }
            }
            // Stop scheduling frames (if not already stopped).
            // Idempotent.
            stop() {
                this.animating = false;
            }
            singleFrame() {
                // Instantaneously start and stop, since that schedules a single frame iff
                // there is not already one scheduled.
                this.start();
                this.stop();
            }
        }
    })(Anim = Twisty.Anim || (Twisty.Anim = {}));
})(Twisty || (Twisty = {}));
//# sourceMappingURL=anim.js.map