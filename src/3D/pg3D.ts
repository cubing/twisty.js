import {algToString, Sequence, BlockMove} from "alg"
import {KPuzzleDefinition, Transformation, stateForBlockMove} from "kpuzzle"
import * as THREE from 'three'

import {Puzzle} from "../puzzle"
import {Cursor} from "../cursor"
import {smootherStep} from "../easing"

import {Twisty3D, TAU} from "./twisty3D"

class StickerDef {
  private ori:number ;
  private perm:number ;
  private orbit: string ;
  public origColor:THREE.Color ;
  public faceColor:THREE.Color ;
  public cubie:THREE.Group ;
  protected geo:THREE.Geometry ;
  constructor(stickerDat:any) {
    this.origColor = new THREE.Color(stickerDat.color) ;
    this.faceColor = new THREE.Color(stickerDat.color) ;
    this.orbit = stickerDat.orbit ;
    this.ori = stickerDat.ori ;
    this.perm = stickerDat.perm ;
    this.cubie = new THREE.Group() ;
    this.geo = new THREE.Geometry() ;
    var coords = stickerDat.coords as number[][] ;
    var vertind:number[] = [] ;
    for (var ci=0; ci<coords.length; ci++) {
       var v = new THREE.Vector3(coords[ci][0], coords[ci][1], coords[ci][2]) ;
       vertind.push(this.geo.vertices.length) ;
       this.geo.vertices.push(v) ;
    }
    for (var g=1; g+1<vertind.length; g++) {
       var face = new THREE.Face3(vertind[0], vertind[g], vertind[g+1]) ;
       face.color = this.faceColor ;
       this.geo.faces.push(face) ;
    }
    this.geo.computeFaceNormals() ;
    var obj = new THREE.Mesh(this.geo,
               new THREE.MeshBasicMaterial({vertexColors: THREE.FaceColors})) ;
    this.cubie.add(obj) ;
  }
  public setColor(c:THREE.Color) {
    this.geo.colorsNeedUpdate = true ;
    this.faceColor.copy(c) ;
  }
}

class AxisInfo {
  public axis:THREE.Vector3 ;
  public order:number ;
  constructor(axisDat:any) {
    var vec = axisDat[0] as number[] ;
    this.axis = new THREE.Vector3(vec[0], vec[1], vec[2]) ;
    this.order = axisDat[2] ;
  }
}

const PG_SCALE = 1/2 ;

// TODO: Split into "scene model" and "view".
export class PG3D extends Twisty3D<Puzzle> {
  private cube: THREE.Mesh ;
  private stickers: {[key:string]:StickerDef[][]} ;
  private axesInfo: {[key:string]:AxisInfo} ;

  constructor(private definition:KPuzzleDefinition, pgdat:any) {
    super();
    this.axesInfo = {} ;
    var axesDef = pgdat.axis as any[] ;
    for (var axi=0; axi<axesDef.length; axi++)
       this.axesInfo[axesDef[axi][1]] = new AxisInfo(axesDef[axi]) ;
    var stickers = pgdat.stickers as any[] ;
    this.stickers = {} ;
    for (var si=0; si<stickers.length; si++) {
      var orbit = stickers[si].orbit as number ;
      var ord = stickers[si].ord as number ;
      var ori = stickers[si].ori as number ;
      if (!this.stickers[orbit])
         this.stickers[orbit] = [] ;
      if (!this.stickers[orbit][ori])
         this.stickers[orbit][ori] = [] ;
      var sticker = new StickerDef(stickers[si]) ;
      sticker.cubie.scale.set(PG_SCALE, PG_SCALE, PG_SCALE) ;
      this.stickers[orbit][ori][ord] = sticker ;
      this.scene.add(sticker.cubie) ;
    }
  }

  private ease(fraction: number) {
    return smootherStep(fraction)
  }

  protected updateScene(p: Cursor.Position<Puzzle>) {
    const pos = <Transformation>p.state;
    const noRotation = new THREE.Euler() ;
    for (var orbit in this.stickers) {
      const pieces = this.stickers[orbit];
      const pos2 = pos[orbit] ;
      const orin = pieces.length ;
      for (var ori = 0; ori < orin; ori++) {
        const pieces2 = pieces[ori] ;
        for (var i=0; i<pieces2.length; i++) {
           pieces2[i].cubie.rotation.copy(noRotation) ;
           var nori = (ori + orin - pos2.orientation[i]) % orin ;
           var ni = pos2.permutation[i] ;
           pieces2[i].setColor(pieces[nori][ni].origColor) ;
        }
      }
      for (const moveProgress of p.moves) {
        const blockMove = moveProgress.move as BlockMove;
        var fullMove = stateForBlockMove(this.definition, blockMove) ;
        var ax = this.axesInfo[blockMove.family.toUpperCase()] ;
        const turnNormal = ax.axis ;
        const angle = - this.ease(moveProgress.fraction) *
                    moveProgress.direction * blockMove.amount * TAU/ax.order ;
        var mv = fullMove[orbit] ;
        for (var ori = 0; ori < orin; ori++) {
          const pieces2 = pieces[ori] ;
          for (var i=0; i<pieces2.length; i++) {
             var ni = mv.permutation[i] ;
             if (ni != i || mv.orientation[i] != 0) {
               pieces2[i].cubie.rotateOnAxis(turnNormal, angle) ;
             }
          }
        }
      }
    }
  }
}
