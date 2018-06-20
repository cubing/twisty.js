declare function twistyTest(description: string, condition: boolean): void;
declare function positionEqual<P extends Twisty.Puzzle>(puz: P, c: Twisty.Cursor<P>, ts: Twisty.Cursor.Duration, expected: Twisty.Cursor.Position<P>): boolean;
