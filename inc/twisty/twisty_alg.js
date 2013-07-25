
var alg = (function (){

  var debug = false;

  var sign_w = (function(){
  
    //TODO 20110906: Slice moves.
    var pattern = /((\d*)-)?(\d*)([UFRBLDufrbldxyz]w?)([\d]*)('?)/g;
    var pattern_move = /^((\d*)-)?(\d*)([UFRBLDufrbldxyz]w?)([\d]*)('?)$/;

    function stringToMove(moveString) {

      if (debug) console.log("[Move] " + moveString);
      
      var parts = pattern_move.exec(moveString);
      if (debug) console.log(parts);

      var outStartSlice = 1;
      var outEndSlice = 1; 
      var baseMove = parts[4]; 
      var amount = 1;

      if (/^[UFRBLD]$/g.test(baseMove)) {
        var outEndSliceParsed = parseInt(parts[3]);
        if (!isNaN(outEndSliceParsed )) {
          outStartSlice = outEndSliceParsed;
          outEndSlice = outEndSliceParsed;
        }
      }

      if (/^[ufrbld]$/g.test(baseMove) ||
          /^[UFRBLD]w$/g.test(baseMove)) {

        baseMove = baseMove[0].toUpperCase();
        outEndSlice = 2;

        var outEndSliceParsed = parseInt(parts[3]);
        if (!isNaN(outEndSliceParsed )) {
          outEndSlice = outEndSliceParsed;
        }

        var outStartSliceParsed = parseInt(parts[2]);
        if (!isNaN(outStartSliceParsed )) {
          outStartSlice = outStartSliceParsed ;
        }
      }

      if (/^[xyz]$/g.test(baseMove)) {
     
        outStartSlice = 1;
        outEndSlice = -1;
        
        var sliceMap = {"x": "R", "y": "U", "z": "F"};
        
        baseMove = sliceMap[baseMove];
        
      }
      
      /* Amount */
      
      var amountParsed = parseInt(parts[5]);
      if (!isNaN(amountParsed)) {
        amount = amountParsed;
      }
      if (parts[6] == "'") {
        amount *= -1;
      }
      
      /* Return */
      
      return [outStartSlice, outEndSlice, baseMove, amount];
      
    }

    function stringToAlg(algString) {
      
      var moveStrings = algString.match(pattern);
      var alg = [];
      
      if (debug) console.log(moveStrings);
      
      for (i in moveStrings) {
        var move = stringToMove(moveStrings[i]);
        alg.push(move);
      }
      
      if (debug) console.log(alg);
      
      return alg;
      
    }

    function algToString(alg) {
      
      var algString = "";
      for (i in alg) {
        var moveString = "";
        if (alg[i][0] != alg[i][1]) {
          moveString += alg[i][0] + "-";
        }
        
      }
      
    }

    return {
      algToString: algToString,
      stringToAlg: stringToAlg
    }
  })();

  return {
    sign_w: sign_w
  }
})();