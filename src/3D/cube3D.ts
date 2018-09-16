import {KPuzzleDefinition} from "kpuzzle"
import * as THREE from 'three'

import {Puzzle} from "../puzzle"
import {Cursor} from "../cursor"

import {Twisty3D, TAU} from "./twisty3D"

function smootherStep(x: number): number {
  return x*x*x*(10-x*(15-6*x));
};

// TODO: Split into "scene model" and "view".
export class Cube3D extends Twisty3D<Puzzle> {
  private drawn = false;
  private box: THREE.Mesh;
  constructor(def: KPuzzleDefinition) {
    super();
    if (def.name !== "333") {
      throw "Invalid puzzle for this Cube3D implementation."
    }
  }

  protected populateScene(): void {
    let material = new THREE.MeshBasicMaterial({
      color: 0x888888
    });
    this.box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
    this.scene.add(this.box);
  }

  protected updateScene(p: Cursor.Position<Puzzle>) {
    this.box.rotation.y = smootherStep(p.moves.length > 0 ? p.moves[0].fraction : 0) * TAU / 4;
  }
}
