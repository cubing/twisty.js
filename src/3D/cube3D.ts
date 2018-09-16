import {KPuzzleDefinition, Transformation} from "kpuzzle"
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

const face = {
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

// TODO: Move outside class
class CubieDef {
  public matrix: THREE.Matrix4;
  constructor(public stickerFaces: number[], pos: THREE.Vector3, q: THREE.Quaternion) {
    this.matrix = new THREE.Matrix4();
    this.matrix.setPosition(pos);
    this.matrix.premultiply(new THREE.Matrix4().makeRotationFromQuaternion(q));
  }
}

// TODO: Move outside class

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

const edgePos = new THREE.Vector3(0, 1, 1);
const edgeRot = [0, 1].map(i => new THREE.Matrix4().makeRotationAxis(edgePos.clone().normalize(), -i * TAU/2));
const cornerPos = new THREE.Vector3(1, 1, 1);
const cornerRot = [0, 1, 2].map(i => new THREE.Matrix4().makeRotationAxis(cornerPos.clone().normalize(), -i * TAU/3));
const centerPos = new THREE.Vector3(0, 1, 0);
const centerRot = [0, 1, 2, 3].map(i => new THREE.Matrix4().makeRotationAxis(centerPos.clone().normalize(), -i * TAU/4));
const cubieStickerOrder = [
  face.U,
  face.F,
  face.R
];

const edgeDefs: CubieDef[] = [
  new CubieDef([face.U, face.F], edgePos, t(r.O, 0)),
  new CubieDef([face.U, face.L], edgePos, t(r.U, 1)),
  new CubieDef([face.U, face.B], edgePos, t(r.U, 2)),
  new CubieDef([face.U, face.R], edgePos, t(r.U, 3)),
  new CubieDef([face.D, face.F], edgePos, t(r.F, 2)),
  new CubieDef([face.D, face.R], edgePos, t(r.F, 2).premultiply(t(r.D, 1))),
  new CubieDef([face.D, face.B], edgePos, t(r.F, 2).premultiply(t(r.D, 2))),
  new CubieDef([face.D, face.L], edgePos, t(r.F, 2).premultiply(t(r.D, 3))),
  new CubieDef([face.F, face.R], edgePos, t(r.U, 3).premultiply(t(r.R, 3))),
  new CubieDef([face.F, face.L], edgePos, t(r.U, 1).premultiply(t(r.R, 3))),
  new CubieDef([face.B, face.R], edgePos, t(r.U, 3).premultiply(t(r.R, 1))),
  new CubieDef([face.B, face.L], edgePos, t(r.U, 1).premultiply(t(r.R, 1)))
];

const cornerDefs: CubieDef[] = [
  new CubieDef([face.U, face.F, face.R], cornerPos, t(r.O, 0)),
  new CubieDef([face.U, face.R, face.B], cornerPos, t(r.U, 3)),
  new CubieDef([face.U, face.B, face.L], cornerPos, t(r.U, 2)),
  new CubieDef([face.U, face.L, face.F], cornerPos, t(r.U, 1)),
  new CubieDef([face.D, face.R, face.F], cornerPos, t(r.F, 2).premultiply(t(r.D, 1))),
  new CubieDef([face.D, face.F, face.L], cornerPos, t(r.F, 2).premultiply(t(r.D, 0))),
  new CubieDef([face.D, face.L, face.B], cornerPos, t(r.F, 2).premultiply(t(r.D, 3))),
  new CubieDef([face.D, face.B, face.R], cornerPos, t(r.F, 2).premultiply(t(r.D, 2)))
];

const centerDefs: CubieDef[] = [
  new CubieDef([face.U], centerPos, t(r.O, 0)),
  new CubieDef([face.L], centerPos, t(r.R, 3).premultiply(t(r.U, 1))),
  new CubieDef([face.F], centerPos, t(r.R, 3)),
  new CubieDef([face.R], centerPos, t(r.R, 3).premultiply(t(r.D, 1))),
  new CubieDef([face.B], centerPos, t(r.R, 3).premultiply(t(r.D, 2))),
  new CubieDef([face.D], centerPos, t(r.R, 2))
];

// TODO: Split into "scene model" and "view".
export class Cube3D extends Twisty3D<Puzzle> {
  private cube: THREE.Group;
  private edges: THREE.Object3D[];
  private corners: THREE.Object3D[];
  private centers: THREE.Object3D[];
  constructor(def: KPuzzleDefinition) {
    super();
    if (def.name !== "333") {
      throw "Invalid puzzle for this Cube3D implementation."
    }
  }

  private createSticker(posAxisInfo: AxisInfo, materialAxisInfo: AxisInfo, isHint: boolean): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(cubieDimensions.stickerWidth, cubieDimensions.stickerWidth);
    var stickerMesh = new THREE.Mesh(geo, isHint ? materialAxisInfo.hintStickerMaterial : materialAxisInfo.stickerMaterial);
    stickerMesh.setRotationFromEuler(posAxisInfo.fromZ);
    stickerMesh.position.copy(posAxisInfo.vector);
    stickerMesh.position.multiplyScalar(isHint ? cubieDimensions.hintStickerElevation : cubieDimensions.stickerElevation);
    return stickerMesh;
  }

  // TODO: Support creating only the outward-facing parts?
  private createCubieFoundation(): THREE.Mesh {
    const box = new THREE.BoxGeometry(cubieDimensions.foundationWidth, cubieDimensions.foundationWidth, cubieDimensions.foundationWidth);
    return new THREE.Mesh(box, blackMesh);
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

  protected populateScene(): void {
    this.cube = new THREE.Group();
    this.edges = edgeDefs.map(this.createCubie.bind(this));
    this.corners = cornerDefs.map(this.createCubie.bind(this));
    this.centers = centerDefs.map(this.createCubie.bind(this));
    this.cube.scale.set(1/3, 1/3, 1/3);
    this.scene.add(this.cube);
  }

  protected updateScene(p: Cursor.Position<Puzzle>) {
    const reid333 = <Transformation>p.state;
    for (var i = 0; i < 12; i++) {
      const j = reid333["EDGE"].permutation[i];
      this.edges[j].matrix.copy(edgeDefs[i].matrix);
      this.edges[j].matrix.multiply(edgeRot[reid333["EDGE"].orientation[i]]);
    }
    for (var i = 0; i < 8; i++) {
      const j = reid333["CORNER"].permutation[i];
      this.corners[j].matrix.copy(cornerDefs[i].matrix);
      this.corners[j].matrix.multiply(cornerRot[reid333["CORNER"].orientation[i]]);
    }
    for (var i = 0; i < 6; i++) {
      const j = reid333["CENTER"].permutation[i];
      this.centers[j].matrix.copy(centerDefs[i].matrix);
      this.centers[j].matrix.multiply(centerRot[reid333["CORNER"].orientation[i]]);
    }
  }
}
