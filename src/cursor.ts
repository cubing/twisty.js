import {
  AlgPart,
  BlockMove,
  CommentLong,
  CommentShort,
  Commutator,
  Conjugate,
  Example,
  Group,
  NewLine,
  Pause,
  Sequence,
  expand
} from "alg"
import {TraversalUp} from "alg"
import {Puzzle, State} from "./puzzle"

"use strict";

// TODO: Include Pause.
class CountAnimatedMoves extends TraversalUp<number> {
  public traverseSequence(sequence: Sequence): number {
    var total = 0;
    for (var part of sequence.nestedUnits) {
      total += this.traverse(part);
    }
    return total;
  }
  public traverseGroup(group: Group): number {
    return this.traverseSequence(group.nestedSequence);
  }
  public traverseBlockMove(blockMove: BlockMove): number {
    return 1;
  }
  public traverseCommutator(commutator: Commutator): number {
    return 2*(this.traverseSequence(commutator.A) + this.traverseSequence(commutator.B));
  }
  public traverseConjugate(conjugate: Conjugate): number {
    return 2*(this.traverseSequence(conjugate.A)) + this.traverseSequence(conjugate.B);
  }
  public traversePause(pause: Pause):                      number { return 0; }
  public traverseNewLine(newLine: NewLine):                number { return 0; }
  public traverseCommentShort(commentShort: CommentShort): number { return 0; }
  public traverseCommentLong(commentLong: CommentLong):    number { return 0; }
}

const countAnimatedMovesInstance = new CountAnimatedMoves();
const countAnimatedMoves = countAnimatedMovesInstance.traverse.bind(countAnimatedMovesInstance);

export class Cursor<P extends Puzzle> {
  private moves: Sequence;
  private durationFn: TraversalUp<Cursor.Duration>;

  private state: State<P>;
  private moveIdx: number;
  private moveStartTimestamp: Cursor.Duration;
  private algTimestamp: Cursor.Duration;
  constructor(public alg: Sequence, private puzzle: P) {
    this.setMoves(alg);
    this.setPositionToStart();

    this.durationFn = new Cursor.AlgDuration(Cursor.DefaultDurationForAmount)
  }

  private setMoves(alg: Sequence) {
    var moves = expand(alg);
    if (moves.type == "sequence") {
      this.moves = moves
    } else {
      this.moves = new Sequence([moves]);
    }

    if (this.moves.nestedUnits.length === 0) {
      throw "empty alg"
    }
    // TODO: Avoid assuming all base moves are block moves.
  }

  private algDuration() {
    // TODO: Cache internally once performance matters.
    return this.durationFn.traverse(this.moves);
  }

  private numMoves() {
    // TODO: Cache internally once performance matters.
    return countAnimatedMoves(this.moves);
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

  startOfAlg(): Cursor.Duration {
    return 0;
  }
  endOfAlg(): Cursor.Duration {
    return this.algDuration();
  }
  private moveDuration(): Cursor.Duration {
    // TODO: Cache
    return this.durationFn.traverse(this.moves.nestedUnits[this.moveIdx]);
  }
  currentPosition(): Cursor.Position<P> {
    var pos = <Cursor.Position<P>>{
      state: this.state,
      moves: []
    }
    var move = this.moves.nestedUnits[this.moveIdx];
    var moveTS = this.algTimestamp - this.moveStartTimestamp;
    if (moveTS !== 0) {
      pos.moves.push({
        move: move,
        direction: Cursor.Direction.Forwards,
        // TODO: Expose a way to traverse `Unit`s directly?
        fraction: moveTS / this.durationFn.traverse(new Sequence([move]))
      });
    }
    return pos;
  }
  currentTimestamp(): Cursor.Duration {
    return this.algTimestamp;
  }
  delta(duration: Cursor.Duration, stopAtMoveBoundary: boolean): boolean {
    // TODO: Unify forward and backward?
    if (duration > 0) {
      return this.forward(duration, stopAtMoveBoundary);
    } else {
      return this.backward(-duration, stopAtMoveBoundary);
    }
  }

  // TODO: Avoid assuming a single move at a time.
  forward(duration: Cursor.Duration, stopAtEndOfMove: boolean): /* TODO: Remove this. Represents if move breakpoint was reached. */ boolean {
    if (duration < 0) {
      throw "negative";
    }
    var remainingOffset = (this.algTimestamp - this.moveStartTimestamp) + duration;

    while (this.moveIdx < this.numMoves()) {
      var move = this.moves.nestedUnits[this.moveIdx];
      if(move.type != "blockMove") {
        throw "TODO — Only BlockMove supported for cursor.";
      }
      var lengthOfMove = this.durationFn.traverse(move);
      if (remainingOffset < lengthOfMove) {
        this.algTimestamp = this.moveStartTimestamp + remainingOffset;
        return false;
      }
      this.state = this.puzzle.combine(
        this.state,
        this.puzzle.stateFromMove(move as BlockMove)
      );
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
  backward(duration: Cursor.Duration, stopAtStartOfMove: boolean): /* TODO: Remove this. Represents of move breakpoint was reachec. */ boolean {
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

      var prevMove = this.moves.nestedUnits[this.moveIdx - 1];
      if(prevMove.type != "blockMove") {
        throw "TODO - only BlockMove supported";
      }

      this.state = this.puzzle.combine(
        this.state,
        this.puzzle.invert(this.puzzle.stateFromMove(prevMove as BlockMove))
      );
      var lengthOfMove = this.durationFn.traverse(prevMove);
      this.moveIdx -= 1;
      this.moveStartTimestamp -= lengthOfMove;
      this.algTimestamp = this.moveStartTimestamp;
      remainingOffset += lengthOfMove;
    }
    return true;
  }
}

export namespace Cursor {
  export type Duration = number; // Duration in milliseconds
  // TODO: Extend `number`, introduce MoveSequenceTimestamp vs. EpochTimestamp,
  // force Duration to be a difference.
  export type Timestamp = Duration; // Duration since a particular epoch.

  export type Fraction = number; // Value from 0 to 1.

  export enum Direction {
    Forwards = 1,
    Paused = 0,
    Backwards = -1
  }

  export interface MoveProgress {
    move: AlgPart
    direction: Direction
    fraction: number
  }

  export type Position<P extends Puzzle> = {
    state: State<P>
    moves: MoveProgress[]
  }

  export enum BreakpointType {
    Move,
    EntireMoveSequence
  }

  export type DurationForAmount = (amount: number) => Duration;

  export function ConstantDurationForAmount(amount: number): Duration {
    return 1000;
  }

  export function DefaultDurationForAmount(amount: number): Duration {
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

  export class AlgDuration extends TraversalUp<Duration> {
    // TODO: Pass durationForAmount as Down type instead?
    constructor(public durationForAmount = DefaultDurationForAmount) {
      super()
    }

    public traverseSequence(sequence: Sequence):             Duration {
      var total = 0;
      for (var alg of sequence.nestedUnits) {
        total += this.traverse(alg)
      }
      return total;
    }
    public traverseGroup(group: Group):                      Duration { return group.amount * this.traverse(group.nestedSequence); }
    public traverseBlockMove(blockMove: BlockMove):             Duration { return this.durationForAmount(blockMove.amount); }
    public traverseCommutator(commutator: Commutator):       Duration { return commutator.amount * 2 * (this.traverse(commutator.A) + this.traverse(commutator.B)); }
    public traverseConjugate(conjugate: Conjugate):          Duration { return conjugate.amount * (2 * this.traverse(conjugate.A) + this.traverse(conjugate.B)); }
    public traversePause(pause: Pause):                      Duration { return this.durationForAmount(1); }
    public traverseNewLine(newLine: NewLine):                Duration { return this.durationForAmount(1); }
    public traverseCommentShort(commentShort: CommentShort): Duration { return this.durationForAmount(0); }
    public traverseCommentLong(commentLong: CommentLong):    Duration { return this.durationForAmount(0); }
  }
}

// var c = new Cursor(Example.APermCompact);
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


// abstract class Position<AlgType extends Algorithm> {
//   Alg: AlgType;
//   Direction: Timeline.Direction;
//   TimeToSubAlg: Timeline.Duration;
//   SubAlg: Algorithm | null;
// }
