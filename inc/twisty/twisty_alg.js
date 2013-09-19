
var alg = (function (){

  var debug = false;

  var patterns = {
    single: /^[UFRBLD]$/,
    wide: /^([ufrbld])|([UFRBLD]w)$/,
    slice: /^[MES]$/,
    rotation: /^[xyz]$/
  };

  var directionMap = {
    "U": "U", "Uw": "U", "u": "U",           "y": "U",
    "F": "F", "Fw": "F", "f": "F", "S": "F", "z": "F",
    "R": "R", "Rw": "R", "r": "R",           "x": "R",
    "B": "B", "Bw": "B", "b": "B",
    "L": "L", "Lw": "L", "l": "L", "M": "L",
    "D": "D", "Dw": "D", "d": "D", "E": "D",
    ".": "."
  };

  function canonicalizeMove(orig) {
    var move = {};

    move.amount = orig.amount;
    move.base = directionMap[orig.base];

    if (patterns.single.test(orig.base)) {
      move.startLayer = orig.layer || 1;
      move.endLayer = move.startLayer;
    } else if (patterns.wide.test(orig.base)) {
      move.startLayer = orig.startLayer || 1;
      move.endLayer = orig.endLayer || 2;
    } else if (patterns.slice.test(orig.base)) {
      move.startLayer = 2;
      move.endLayer = -2;
    } else if (patterns.rotation.test(orig.base)) {
      move.startLayer = 1;
      move.endLayer = -1;
    }

    return move;
  }

  var sign_w = (function(){

    function algSimplify(alg) {
      var algOut = [];
      for (var i = 0; i < alg.length; i++) {
        var move = alg[i];
        if (algOut.length > 0 &&
            algOut[algOut.length-1].startLayer == move.startLayer &&
            algOut[algOut.length-1].endLayer == move.endLayer &&
            algOut[algOut.length-1].base == move.base) {
          algOut[algOut.length-1].amount += move[3];
          algOut[algOut.length-1].amount = (((algOut[algOut.length-1][3] + 1 % 4) + 4) % 4) -1; // TODO: R2'
          if (algOut[algOut.length-1].amount == 0) {
            algOut.pop();
          }
        }
        else {
          algOut.push(cloneMove(move));
        }
        //console.log(JSON.stringify(algOut));
      }
      return algOut;
    }

    function algToString(algIn, dimension) {

      var alg = algSimplify(algIn);
      
      var moveStrings = [];
      for (i in alg) {

        var tL = alg[i].layer;
        var sL = alg[i].startLayer;
        var oL = alg[i].endLayer;
        var move = alg[i].base;
        var amount = Math.abs(alg[i].amount);
        var amountDir = (alg[i].amount > 0) ? 1 : -1; // Mutable

        var prefix = "";
        var suffix = "";

        // Prefix logic
        if (patterns.single.test(alg[i].base)) {
          if (alg[i].layer) {
            prefix = alg[i].layer.toString();
          }
        } else if (patterns.wide.test(alg[i].base)) {
          if (alg[i].endLayer) {
            prefix = alg[i].endLayer.toString();
            if (alg[i].startLayer) {
              prefix = alg[i].startLayer.toString() + "-" + prefix;
            }
          }
        }

        // Suffix Logic
        if (amount == 0) {
          continue;
        } else if (amount > 1) {
          suffix += "" + amount;
        }

        if (amountDir === -1) {
          suffix += "'";
        }

        moveString = prefix + alg[i].base + suffix;
        moveStrings.push(moveString);
      }
      return moveStrings.join(" ");
    }

    function cloneMove(move) {
      var newMove = {};
      for (i in move) {
        newMove[i] = move[i]
      }
      return newMove;
    }

    function invert(algIn) {
      var algInverse = [];
      for (i in algIn) {
        var move = cloneMove(algIn[i]);
        move.amount *= -1;
        algInverse.push(move);
      }
      return algInverse.reverse();
    }

    function stringToAlg(algString) {
      return sign_w_jison.parse(algString);
    }

    return {
      algToString: algToString,
      stringToAlg: stringToAlg,
      invert: invert,
      canonicalizeMove: canonicalizeMove
    }
  })();

  return {
    sign_w: sign_w
  }
})();