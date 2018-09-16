import {KPuzzleDefinition} from "kpuzzle"
import * as THREE from 'three'

import {Puzzle} from "../puzzle"
import {Cursor} from "../cursor"
import {smootherStep} from "../easing"

import {Twisty3D, TAU} from "./twisty3D"

class AxisInfo {
  public stickerMaterial: THREE.MeshBasicMaterial;
  public hintStickerMaterial: THREE.MeshBasicMaterial;
  constructor(public vector: THREE.Vector3, public fromZ: THREE.Euler, public color: number) {
    // TODO: Make sticker material single-sided when cubie base is rendered?
    this.stickerMaterial = new THREE.MeshBasicMaterial({color: color, side: THREE.DoubleSide})
    this.hintStickerMaterial = new THREE.MeshBasicMaterial({color: color, side: THREE.BackSide})
  }
}

const axesInfo: AxisInfo[] = [
  new AxisInfo(new THREE.Vector3( 0,  1,  0), new THREE.Euler(-TAU/4,  0,  0), 0xffffff),
  new AxisInfo(new THREE.Vector3(-1,  0,  0), new THREE.Euler( 0, -TAU/4,  0), 0xff8800),
  new AxisInfo(new THREE.Vector3( 0,  0,  1), new THREE.Euler( 0,  0,  0), 0x00ff00),
  new AxisInfo(new THREE.Vector3( 1,  0,  0), new THREE.Euler( 0,  TAU/4,  0), 0xff0000),
  new AxisInfo(new THREE.Vector3( 0,  0, -1), new THREE.Euler( 0,  TAU/2,  0), 0x0000ff),
  new AxisInfo(new THREE.Vector3( 0, -1,  0), new THREE.Euler( TAU/4,  0,  0), 0xffff00)
];

const cubieDimensions = {
  stickerWidth: 0.85,
  stickerElevation: 0.501,
  foundationWidth: 1,
  hintStickerElevation: 1.45
}

const cubieConfig = {
  showMainStickers: true,
  showHintStickers: true,
  showFoundation: true // TODO: better name
}

const blackMesh = new THREE.MeshBasicMaterial({color: 0x000000});

// TODO: Split into "scene model" and "view".
export class Cube3D extends Twisty3D<Puzzle> {
  private cube: THREE.Group;
  constructor(def: KPuzzleDefinition) {
    super();
    if (def.name !== "333") {
      throw "Invalid puzzle for this Cube3D implementation."
    }
  }

  private createSticker(position: THREE.Vector3, axisInfo: AxisInfo, isHint: boolean): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(cubieDimensions.stickerWidth, cubieDimensions.stickerWidth);
    var stickerMesh = new THREE.Mesh(geo, isHint ? axisInfo.hintStickerMaterial : axisInfo.stickerMaterial);
    stickerMesh.setRotationFromEuler(axisInfo.fromZ);
    stickerMesh.position.set(
      axisInfo.vector.x,
      axisInfo.vector.y,
      axisInfo.vector.z
    );
    stickerMesh.position.multiplyScalar(isHint ? cubieDimensions.hintStickerElevation : cubieDimensions.stickerElevation);
    return stickerMesh;
  }

  // TODO: Support creating only the outward-facing parts?
  private createCubieFoundation(position: THREE.Vector3): THREE.Mesh {
    const box = new THREE.BoxGeometry(cubieDimensions.foundationWidth, cubieDimensions.foundationWidth, cubieDimensions.foundationWidth);
    return new THREE.Mesh(box, blackMesh);
  }

  private createCubie(position: THREE.Vector3): THREE.Object3D {
    const cubie = new THREE.Group();
    if (cubieConfig.showFoundation) {
      cubie.add(this.createCubieFoundation(position));
    }
    for (var axisInfo of axesInfo) {
      if (position.dot(axisInfo.vector) != 1) {
        // Skip stickers that don't exist on this cubie.
        continue;
      }
      if (cubieConfig.showMainStickers) {
        cubie.add(this.createSticker(position, axisInfo, true));
      }
      if (cubieConfig.showHintStickers) {
        cubie.add(this.createSticker(position, axisInfo, false));
      }
    }
    cubie.position.set(position.x, position.y, position.z);
    return cubie;
  }

  protected populateScene(): void {
    this.cube = new THREE.Group();
    for (var x = -1; x < 2; x++) {
      for (var y = -1; y < 2; y++) {
        for (var z = -1; z < 2; z++) {
          const position = new THREE.Vector3(x, y, z);
          this.cube.add(this.createCubie(position));
        }
      }
    }
    this.cube.scale.set(1/3, 1/3, 1/3);
    this.scene.add(this.cube);
  }

  protected updateScene(p: Cursor.Position<Puzzle>) {
    this.cube.rotation.y = smootherStep(p.moves.length > 0 ? p.moves[0].fraction : 0) * TAU;
  }
}
