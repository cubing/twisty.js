import * as alg from "alg"
import * as KPuzzle from "kpuzzle"

import * as Anim from "./anim"
import {Cursor} from "./cursor"
import {Puzzle, State, KSolvePuzzle} from "./puzzle"
import * as Widget from "./widget"

"use strict";

class TwistyParams {
   alg?: alg.Algorithm;
   puzzle?: KPuzzle.KPuzzleDefinition;
}

// TODO: Turn Twisty into a module and move Twisty.Twisty into Twisty proper.
export class Twisty {
  private alg: alg.Algorithm;
  private anim: Anim.Model;
  private cursor: Cursor<Puzzle>;
  private puzzleDef: KPuzzle.KPuzzleDefinition; // TODO: Replace this with a Puzzle instance.
  constructor(public element: Element, config: TwistyParams = {}) {
    this.alg = config.alg || alg.Example.Niklas;
    this.puzzleDef = config.puzzle || KPuzzle.Puzzles["333"];
    this.cursor = new Cursor(this.alg, new KSolvePuzzle(this.puzzleDef));
    // this.timeline = new Timeline(alg.Example.HeadlightSwaps);
    this.anim = new Anim.Model(this.cursor);

    this.element.appendChild((new Widget.Player(this.anim, this.puzzleDef)).element);
  }

  public setAlg(alg: alg.Algorithm): void {
    this.anim.skipToStart();
    this.alg = alg;
    this.cursor.setAlg(alg);
  }
}

function paramsFromTwistyElem(elem: Element): TwistyParams {
  var params = new TwistyParams();

  var puzzle = elem.getAttribute("puzzle");
  if (puzzle) {
    params.puzzle = KPuzzle.Puzzles[puzzle];
  }

  var algo = elem.getAttribute("alg");
  if (algo) {
    params.alg = alg.parse(algo); // TODO: parse
  }

  return params;
}

// Initialize a Twisty for the given Element unless the element's
// `initialization` attribute is set to `custom`.
function autoInitialize(elem: Element) {
  const ini = elem.getAttribute("initialization");
  var params = paramsFromTwistyElem(elem);
  if (ini !== "custom") {
    new Twisty(elem, params);
  }
}

function autoInitializePage() {
  const elems = document.querySelectorAll("twisty");
  console.log(`Found ${elems.length} twisty elem${elems.length === 1 ? "" : "s"} on page.`)

  for (let i = 0; i < elems.length; i++) {
    autoInitialize(elems[i]);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("load", autoInitializePage);
}
