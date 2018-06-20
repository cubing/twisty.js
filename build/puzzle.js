export class Puzzle {
    multiply(state, amount) {
        if (amount < 0) {
            return this.invert(this.multiply(state, -amount));
        }
        var newState = this.startState();
        for (var i = 0; i < amount; i++) {
            newState = this.combine(newState, state);
        }
        return newState;
    }
}
export class KSolvePuzzle extends Puzzle {
    constructor(definition) {
        super();
        this.definition = definition;
    }
    static fromID(id) {
        return new KSolvePuzzle(KSolve.Puzzles[id]);
    }
    startState() {
        return this.definition.startPieces;
    }
    invert(state) {
        return KSolve.Invert(this.definition, state);
    }
    combine(s1, s2) {
        return KSolve.Combine(this.definition, s1, s2);
    }
    stateFromMove(moveName) {
        var state = this.definition.moves[moveName];
        if (!state) {
            throw `Unknown move: ${moveName}`;
        }
        return state;
    }
    equivalent(s1, s2) {
        return KSolve.EquivalentStates(this.definition, s1, s2);
    }
}
class QTMCounterState {
    constructor(value) {
        this.value = value;
    }
}
export class QTMCounterPuzzle extends Puzzle {
    startState() {
        return new QTMCounterState(0);
    }
    invert(state) {
        return new QTMCounterState(-state.value);
    }
    combine(s1, s2) {
        return new QTMCounterState(s1.value + s2.value);
    }
    stateFromMove(moveName) {
        return new QTMCounterState(1);
    }
    equivalent(s1, s2) {
        return s1.value === s2.value;
    }
}
//# sourceMappingURL=puzzle.js.map