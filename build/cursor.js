import { Alg } from "alg";
"use strict";
export class Cursor {
    constructor(alg, puzzle) {
        this.alg = alg;
        this.puzzle = puzzle;
        this.setMoves(alg);
        this.setPositionToStart();
        this.durationFn = new Cursor.AlgDuration(Cursor.DefaultDurationForAmount);
    }
    setMoves(alg) {
        var moves = alg.expand();
        if (moves instanceof Alg.Sequence) {
            this.moves = moves;
        }
        else {
            this.moves = new Alg.Sequence([moves]);
        }
        if (this.moves.nestedAlgs.length === 0) {
            throw "empty alg";
        }
        // TODO: Avoid assuming all base moves are block moves.
    }
    algDuration() {
        // TODO: Cache internally once performance matters.
        return this.durationFn.traverse(this.moves);
    }
    numMoves() {
        // TODO: Cache internally once performance matters.
        return this.moves.countBlockMoves();
    }
    setPositionToStart() {
        this.moveIdx = 0;
        this.moveStartTimestamp = 0;
        this.algTimestamp = 0;
        this.state = this.puzzle.startState();
    }
    setPositionToEnd() {
        this.setPositionToStart();
        this.forward(this.algDuration(), false);
    }
    startOfAlg() {
        return 0;
    }
    endOfAlg() {
        return this.algDuration();
    }
    moveDuration() {
        // TODO: Cache
        return this.durationFn.traverse(this.moves.nestedAlgs[this.moveIdx]);
    }
    currentPosition() {
        var pos = {
            state: this.state,
            moves: []
        };
        var move = this.moves.nestedAlgs[this.moveIdx];
        var moveTS = this.algTimestamp - this.moveStartTimestamp;
        if (moveTS !== 0) {
            pos.moves.push({
                move: move,
                direction: Cursor.Direction.Forwards,
                fraction: moveTS / this.durationFn.traverse(move)
            });
        }
        return pos;
    }
    currentTimestamp() {
        return this.algTimestamp;
    }
    delta(duration, stopAtMoveBoundary) {
        // TODO: Unify forward and backward?
        if (duration > 0) {
            return this.forward(duration, stopAtMoveBoundary);
        }
        else {
            return this.backward(-duration, stopAtMoveBoundary);
        }
    }
    // TODO: Avoid assuming a single move at a time.
    forward(duration, stopAtEndOfMove) {
        if (duration < 0) {
            throw "negative";
        }
        var remainingOffset = (this.algTimestamp - this.moveStartTimestamp) + duration;
        while (this.moveIdx < this.numMoves()) {
            var move = this.moves.nestedAlgs[this.moveIdx];
            if (!(move instanceof Alg.BlockMove)) {
                throw "TODO - only BlockMove supported";
            }
            var lengthOfMove = this.durationFn.traverse(move);
            if (remainingOffset < lengthOfMove) {
                this.algTimestamp = this.moveStartTimestamp + remainingOffset;
                return false;
            }
            this.state = this.puzzle.combine(this.state, this.puzzle.multiply(this.puzzle.stateFromMove(move.base), move.amount));
            this.moveIdx += 1;
            this.moveStartTimestamp += lengthOfMove;
            this.algTimestamp = this.moveStartTimestamp;
            remainingOffset -= lengthOfMove;
            if (stopAtEndOfMove) {
                return (remainingOffset > 0);
            }
        }
        return true;
    }
    backward(duration, stopAtStartOfMove) {
        if (duration < 0) {
            throw "negative";
        }
        var remainingOffset = (this.algTimestamp - this.moveStartTimestamp) - duration;
        while (this.moveIdx >= 0) {
            if (remainingOffset >= 0) {
                this.algTimestamp = this.moveStartTimestamp + remainingOffset;
                return false;
            }
            if (stopAtStartOfMove || this.moveIdx === 0) {
                this.algTimestamp = this.moveStartTimestamp;
                return true; // TODO
            }
            var prevMove = this.moves.nestedAlgs[this.moveIdx - 1];
            if (!(prevMove instanceof Alg.BlockMove)) {
                throw "TODO - only BlockMove supported";
            }
            this.state = this.puzzle.combine(this.state, this.puzzle.multiply(this.puzzle.stateFromMove(prevMove.base), -prevMove.amount));
            var lengthOfMove = this.durationFn.traverse(prevMove);
            this.moveIdx -= 1;
            this.moveStartTimestamp -= lengthOfMove;
            this.algTimestamp = this.moveStartTimestamp;
            remainingOffset += lengthOfMove;
        }
        return true;
    }
}
(function (Cursor) {
    let Direction;
    (function (Direction) {
        Direction[Direction["Forwards"] = 1] = "Forwards";
        Direction[Direction["Paused"] = 0] = "Paused";
        Direction[Direction["Backwards"] = -1] = "Backwards";
    })(Direction = Cursor.Direction || (Cursor.Direction = {}));
    let BreakpointType;
    (function (BreakpointType) {
        BreakpointType[BreakpointType["Move"] = 0] = "Move";
        BreakpointType[BreakpointType["EntireMoveSequence"] = 1] = "EntireMoveSequence";
    })(BreakpointType = Cursor.BreakpointType || (Cursor.BreakpointType = {}));
    function ConstantDurationForAmount(amount) {
        return 1000;
    }
    Cursor.ConstantDurationForAmount = ConstantDurationForAmount;
    function DefaultDurationForAmount(amount) {
        switch (Math.abs(amount)) {
            case 0:
                return 0;
            case 1:
                return 1000;
            case 2:
                return 1500;
            default:
                return 2000;
        }
    }
    Cursor.DefaultDurationForAmount = DefaultDurationForAmount;
    class AlgDuration extends Alg.Traversal.Up {
        // TODO: Pass durationForAmount as Down type instead?
        constructor(durationForAmount = DefaultDurationForAmount) {
            super();
            this.durationForAmount = durationForAmount;
        }
        traverseSequence(sequence) {
            var total = 0;
            for (var alg of sequence.nestedAlgs) {
                total += this.traverse(alg);
            }
            return total;
        }
        traverseGroup(group) { return group.amount * this.traverse(group.nestedAlg); }
        traverseBlockMove(blockMove) { return this.durationForAmount(blockMove.amount); }
        traverseCommutator(commutator) { return commutator.amount * 2 * (this.traverse(commutator.A) + this.traverse(commutator.B)); }
        traverseConjugate(conjugate) { return conjugate.amount * (2 * this.traverse(conjugate.A) + this.traverse(conjugate.B)); }
        traversePause(pause) { return this.durationForAmount(1); }
        traverseNewLine(newLine) { return this.durationForAmount(1); }
        traverseCommentShort(commentShort) { return this.durationForAmount(0); }
        traverseCommentLong(commentLong) { return this.durationForAmount(0); }
    }
    Cursor.AlgDuration = AlgDuration;
})(Cursor || (Cursor = {}));
// var c = new Cursor(Alg.Example.APermCompact);
// console.log(c.currentPosition());
// c.forward(4321, false);
// console.log(c.currentPosition());
// c.forward(2000, false);
// console.log(c.currentPosition());
// c.backward(100, false);
// console.log(c.currentPosition());
// c.backward(1800, false);
// console.log(c.currentPosition());
// c.forward(605, false);
// console.log(c.currentPosition());
// c.forward(10000, true);
// console.log(c.currentPosition());
// abstract class Position<AlgType extends Alg.Algorithm> {
//   Alg: AlgType;
//   Direction: Timeline.Direction;
//   TimeToSubAlg: Timeline.Duration;
//   SubAlg: Alg.Algorithm | null;
// }
//# sourceMappingURL=cursor.js.map