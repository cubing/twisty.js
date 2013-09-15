
var alg = (function (){

  var debug = false;

  var patterns = {
    uppercase: /^[UFRBLD]$/,
    lowercase: /^[ufrbld]$/,
    slice: /^[MES]$/,
    wide: /^[UFRBLD]w$/,
    rotation: /^[xyz]$/
  };

  var directionMap = {
    "U": "U", "Uw": "U", "u": "U",           "y": "U",
    "F": "F", "Fw": "F", "f": "F", "S": "F", "z": "F",
    "R": "R", "Rw": "R", "r": "R",           "x": "R",
    "B": "B", "Bw": "B", "b": "B",
    "L": "L", "Lw": "L", "l": "L", "M": "L",
    "D": "D", "Dw": "D", "d": "D", "E": "D"
  };

  function canonicalizeMove(orig) {
    var move = {};

    move.amount = orig.amount;
    move.base = directionMap[orig.base];

    if (patterns.uppercase.test(orig.base)) {
      move.startLayer = orig.layer || 1;
      move.endLayer = move.startLayer;
    }

    if (patterns.lowercase.test(orig.base) ||
        patterns.wide.test(orig.base)) {
      move.startLayer = orig.startLayer || 1;
      move.endLayer = orig.endLayer || 2;
    }

    if (patterns.slice.test(orig.base)) {
      move.startLayer = 2;
      move.endLayer = -2;
    }

    if (patterns.rotation.test(orig.base)) {
      move.startLayer = 1;
      move.endLayer = -1;
    }

    return move;
  }

  var sign_w = (function(){

    // Note: we need to use direct regexp syntax instead of the RegExp constructor,
    // else we seem to lose longest matches.
    var pattern = /(((\d*)-)?(\d*)([UFRBLDMESufrbldxyz]w?)([\d]*)('?)|((\/\/)|(\/\*)|(\*\/)|(\n)|(\.)))/g;
    var pattern_move = /^((\d*)-)?(\d*)([UFRBLDMESufrbldxyz]w?)([\d]*)('?)$/;

    function stringToMove(moveString) {

      if (debug) console.log("[Move] " + moveString);
      
      var parts = pattern_move.exec(moveString);
      if (debug) console.log(parts);

      var move = {
        // startLayer: 1,
        // endLayer: 1,
        base: parts[4],
        amount: 1
      }

      if (patterns.uppercase.test(move.base)) {
        var layerParsed = parseInt(parts[3]);
        if (!isNaN(layerParsed )) {
          move.layer = layerParsed;
        }
      }

      if (patterns.lowercase.test(move.base) ||
          patterns.wide.test(move.base)) {

        var outEndLayerParsed = parseInt(parts[3]);
        if (!isNaN(outEndLayerParsed )) {
          move.endLayer = outEndLayerParsed;

          var outStartLayerParsed = parseInt(parts[2]);
          if (!isNaN(outStartLayerParsed )) {
            move.startLayer = outStartLayerParsed;
          }
        } else {
          move.endLayer = 2;
        }
      }

      if (patterns.slice.test(move.base)) {
        // pass
      }

      if (patterns.rotation.test(move.base)) {
        // pass
      }
      
      /* Amount */
      
      var amountParsed = parseInt(parts[5]);
      if (!isNaN(amountParsed)) {
        move.amount = amountParsed;
      }
      if (parts[6] == "'") {
        move.amount *= -1;
      }
      
      /* Return */
      
      return move;
      
    }

    function stringToAlg(algString) {
      
      var moveStrings = algString.match(pattern);
      var alg = [];
      
      if (debug) console.log(moveStrings);
      
      var inLineComment = false;
      var inLongComment = false;

      for (i in moveStrings) {


        if (moveStrings[i] === "//") { inLineComment = true; continue; }
        if (moveStrings[i] === "\n") { inLineComment = false; alg.push([1, 1, ".", 1]); continue; }
        if (moveStrings[i] === ".")  { alg.push([1, 1, ".", 1]); continue; }
        if (moveStrings[i] === "/*") { inLongComment = true; continue; }
        if (moveStrings[i] === "*/") { 
          if (debug && !inLongComment) { console.err("Closing a comment that wasn't opened!");}
          inLongComment = false;
          continue;
        }
        if (inLineComment || inLongComment) { continue; }

        var move = stringToMove(moveStrings[i]);
        alg.push(move);
      }
      
      if (debug) console.log(alg);
      
      return alg;
      
    }

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

        var iS = alg[i].startLayer;
        var oS = alg[i].endLayer;
        var move = alg[i].base;
        var amount = Math.abs(alg[i].amount);
        var amountDir = (alg[i].amount > 0) ? 1 : -1; // Mutable

        var moveString = "";

        // Move logic
        if (iS == 1 && oS == 1) {
          moveString += move;
        }
        else if (iS == 1 && oS == dimension) {
          var rotationMap = {
            "U": ["y", 1],
            "F": ["z", 1],
            "R": ["x", 1],
            "B": ["z", -1],
            "L": ["x", -1],
            "D": ["y", -1],
          }
          moveString += rotationMap[move][0];
          amountDir *= rotationMap[move][1];
        }
        else if (iS == 1 && oS == 2) {
          moveString += move.toLowerCase();
        }
        else if (dimension == 3 && iS == 2 && oS == 2) {
          var sliceMap = {
            "U": ["E", -1],
            "F": ["S", 1],
            "R": ["M", -1],
            "B": ["S", -1],
            "L": ["M", 1],
            "D": ["E", 1],
          }
          moveString += sliceMap[move][0];
          amountDir *= sliceMap[move][1];
        }
        else if (iS == 1) {
          moveString += oS + move.toLowerCase();
        }
        else if (iS == oS) {
          moveString += iS + move;
        }
        else {
          // TODO: Negative indices.
          moveString += iS + "-" + oS + move.toLowerCase();
        }

        // Suffix Logic
        var suffix = "";
        if (amount == 0) {
          continue;
        }
        if (amount > 1) {
          suffix += "" + amount;
        }
        if (alg[i].amount < 0) {
          suffix += "'";
        }

        moveString += suffix;
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