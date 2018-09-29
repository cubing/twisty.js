import {algToString, Sequence, BlockMove} from "alg"
import {KPuzzleDefinition, Transformation, Puzzles} from "kpuzzle"
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
  new AxisInfo(new THREE.Vector3( 0,  0,  1), new THREE.Euler( 0,  0,      0), 0x00ff00),
  new AxisInfo(new THREE.Vector3( 1,  0,  0), new THREE.Euler( 0,  TAU/4,  0), 0xff0000),
  new AxisInfo(new THREE.Vector3( 0,  0, -1), new THREE.Euler( 0,  TAU/2,  0), 0x0000ff),
  new AxisInfo(new THREE.Vector3( 0, -1,  0), new THREE.Euler( TAU/4,  0,  0), 0xffff00)
];

const face: {[s: string]: number} = {
  U: 0,
  L: 1,
  F: 2,
  R: 3,
  B: 4,
  D: 5
}

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

class CubieDef {
  public matrix: THREE.Matrix4;
  public stickerFaces: number[];
  // stickerFaceNames can be e.g. ["U", "F", "R"], "UFR" if every face is a single letter.
  constructor(public orbit: string, stickerFaceNames: string[] | string, q: THREE.Quaternion) {
    const individualStickerFaceNames = typeof stickerFaceNames === "string" ? stickerFaceNames.split("") : stickerFaceNames;
    this.stickerFaces = individualStickerFaceNames.map(s => face[s]);
    this.matrix = new THREE.Matrix4();
    this.matrix.setPosition(firstPiecePosition[orbit]);
    this.matrix.premultiply(new THREE.Matrix4().makeRotationFromQuaternion(q));
  }
}

function t(v: THREE.Vector3, t4: number): THREE.Quaternion {
  return new THREE.Quaternion().setFromAxisAngle(v, TAU * t4 / 4);
}

const r = {
  O: new THREE.Vector3( 0,  0,  0),
  U: new THREE.Vector3( 0, -1,  0),
  L: new THREE.Vector3( 1,  0,  0),
  F: new THREE.Vector3( 0,  0, -1),
  R: new THREE.Vector3(-1,  0,  0),
  B: new THREE.Vector3( 0,  0,  1),
  D: new THREE.Vector3( 0,  1,  0)
}

interface OrbitIndexed<T> {[s: string]: T}
interface PieceIndexed<T> extends OrbitIndexed<T[]> {}

const firstPiecePosition: OrbitIndexed<THREE.Vector3> = {
  "EDGE": new THREE.Vector3(0, 1, 1),
  "CORNER": new THREE.Vector3(1, 1, 1),
  "CENTER": new THREE.Vector3(0, 1, 0)
}
const orientationRotation: OrbitIndexed<THREE.Matrix4[]> = {
  "EDGE": [0, 1].map(i => new THREE.Matrix4().makeRotationAxis(firstPiecePosition["EDGE"].clone().normalize(), -i * TAU/2)),
  "CORNER": [0, 1, 2].map(i => new THREE.Matrix4().makeRotationAxis(firstPiecePosition["CORNER"].clone().normalize(), -i * TAU/3)),
  "CENTER": [0, 1, 2, 3].map(i => new THREE.Matrix4().makeRotationAxis(firstPiecePosition["CENTER"].clone().normalize(), -i * TAU/4))
}
const cubieStickerOrder = [
  face.U,
  face.F,
  face.R
];

const pieceDefs: PieceIndexed<CubieDef> = {
  "EDGE": [
    new CubieDef("EDGE", "UF", t(r.O, 0)),
    new CubieDef("EDGE", "UR", t(r.U, 3)),
    new CubieDef("EDGE", "UB", t(r.U, 2)),
    new CubieDef("EDGE", "UL", t(r.U, 1)),
    new CubieDef("EDGE", "DF", t(r.F, 2)),
    new CubieDef("EDGE", "DR", t(r.F, 2).premultiply(t(r.D, 1))),
    new CubieDef("EDGE", "DB", t(r.F, 2).premultiply(t(r.D, 2))),
    new CubieDef("EDGE", "DL", t(r.F, 2).premultiply(t(r.D, 3))),
    new CubieDef("EDGE", "FR", t(r.U, 3).premultiply(t(r.R, 3))),
    new CubieDef("EDGE", "FL", t(r.U, 1).premultiply(t(r.R, 3))),
    new CubieDef("EDGE", "BR", t(r.U, 3).premultiply(t(r.R, 1))),
    new CubieDef("EDGE", "BL", t(r.U, 1).premultiply(t(r.R, 1)))
  ],
  "CORNER": [
    new CubieDef("CORNER", "UFR", t(r.O, 0)),
    new CubieDef("CORNER", "URB", t(r.U, 3)),
    new CubieDef("CORNER", "UBL", t(r.U, 2)),
    new CubieDef("CORNER", "ULF", t(r.U, 1)),
    new CubieDef("CORNER", "DRF", t(r.F, 2).premultiply(t(r.D, 1))),
    new CubieDef("CORNER", "DFL", t(r.F, 2).premultiply(t(r.D, 0))),
    new CubieDef("CORNER", "DLB", t(r.F, 2).premultiply(t(r.D, 3))),
    new CubieDef("CORNER", "DBR", t(r.F, 2).premultiply(t(r.D, 2)))
  ],
  "CENTER": [
    new CubieDef("CENTER", "U", t(r.O, 0)),
    new CubieDef("CENTER", "L", t(r.R, 3).premultiply(t(r.U, 1))),
    new CubieDef("CENTER", "F", t(r.R, 3)),
    new CubieDef("CENTER", "R", t(r.R, 3).premultiply(t(r.D, 1))),
    new CubieDef("CENTER", "B", t(r.R, 3).premultiply(t(r.D, 2))),
    new CubieDef("CENTER", "D", t(r.R, 2))
  ]
}

const CUBE_SCALE = 1/3;

// TODO: Split into "scene model" and "view".
export class Cube3D extends Twisty3D<Puzzle> {
  private cube: THREE.Group = new THREE.Group();
  private pieces: PieceIndexed<THREE.Object3D> = {};
  constructor(def: KPuzzleDefinition) {
    super();
    if (def.name !== "333") {
      throw "Invalid puzzle for this Cube3D implementation."
    }
    for (var orbit in pieceDefs) {
      this.pieces[orbit] = pieceDefs[orbit].map(this.createCubie.bind(this));
    }
    this.cube.scale.set(CUBE_SCALE, CUBE_SCALE, CUBE_SCALE);
    this.scene.add(this.cube);
  }

  private createCubie(edge: CubieDef): THREE.Object3D {
    const cubie = new THREE.Group();
    cubie.add(this.createCubieFoundation());
    for (var i = 0; i < edge.stickerFaces.length; i++) {
      cubie.add(this.createSticker(axesInfo[cubieStickerOrder[i]], axesInfo[edge.stickerFaces[i]], false));
    }
    cubie.matrix.copy(edge.matrix);
    cubie.matrixAutoUpdate = false;
    this.cube.add(cubie);
    return cubie;
  }

  // TODO: Support creating only the outward-facing parts?
  private createCubieFoundation(): THREE.Mesh {
    const box = new THREE.BoxGeometry(cubieDimensions.foundationWidth, cubieDimensions.foundationWidth, cubieDimensions.foundationWidth);
    return new THREE.Mesh(box, blackMesh);
  }

  private createSticker(posAxisInfo: AxisInfo, materialAxisInfo: AxisInfo, isHint: boolean): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(cubieDimensions.stickerWidth, cubieDimensions.stickerWidth);
    var stickerMesh = new THREE.Mesh(geo, isHint ? materialAxisInfo.hintStickerMaterial : materialAxisInfo.stickerMaterial);
    stickerMesh.setRotationFromEuler(posAxisInfo.fromZ);
    stickerMesh.position.copy(posAxisInfo.vector);
    stickerMesh.position.multiplyScalar(isHint ? cubieDimensions.hintStickerElevation : cubieDimensions.stickerElevation);
    return stickerMesh;
  }

  protected updateScene(p: Cursor.Position<Puzzle>) {
    console.log(p);
    const reid333 = <Transformation>p.state;
    for (var orbit in pieceDefs) {
      const pieces = pieceDefs[orbit];
      for (var i = 0; i < pieces.length; i++) {
        const j = reid333[orbit].permutation[i];
        this.pieces[orbit][j].matrix.copy(pieceDefs[orbit][i].matrix);
        this.pieces[orbit][j].matrix.multiply(orientationRotation[orbit][reid333[orbit].orientation[i]]);
      }
      for (var moveProgress of p.moves) {
        const blockMove = moveProgress.move as BlockMove;
        const turnNormal = axesInfo[face[blockMove.family]].vector;
        console.log(blockMove.family);
        const moveMatrix = new THREE.Matrix4().makeRotationAxis(turnNormal, - moveProgress.fraction * moveProgress.direction * blockMove.amount * TAU/4);
        if (algToString(new Sequence([moveProgress.move])) === "R") {
          const affectedPieces = [];
          for (var i = 0; i < pieces.length; i++) {
            const j = Puzzles["333"].moves[blockMove.family][orbit].permutation[i];
            if (i !== j || Puzzles["333"].moves[blockMove.family][orbit].orientation[i] !== 0) {
              this.pieces[orbit][j].matrix.premultiply(moveMatrix);
            }
          }
        }
      }
    }
  }
}
