var def = {};
def["2x2x2"] = "Name 2x2\n\n# def-file by Kåre Krig\n# CORNERS: UBL UBR UFR UFL DBR DFR DFL\n# DBL is fixed. No B,L,D moves.\n\nSet CORNERS 7 3\n\nSolved\nCORNERS\n1 2 3 4 5 6 7\nEnd\n\nMove U\nCORNERS\n4 1 2 3 5 6 7\nEnd\n\nMove R\nCORNERS\n1 3 6 4 2 5 7\n0 2 1 0 1 2 0\nEnd\n\nMove F\nCORNERS\n1 2 4 7 5 3 6\n0 0 2 1 0 1 2\nEnd";

var puzzle = {};
var p = puzzle["2x2x2"] = ksolve_jison.parse(def["2x2x2"]);

// console.log(JSON.stringify(puzzle["2x2x2"], null, "  "));

var state = {
  CORNERS: {permutation: [0, 2, 1, 3, 4, 5, 6], orientation: [0, 2, 1, 0, 0, 0, 0]}
}
var state = {
  CORNERS: {permutation: [0, 1, 2, 3, 4, 5, 6], orientation: [0, 0, 0, 0, 0, 0, 0]}
}
$(document).ready(function() {

  var svg = document.getElementById("puzzle");

  var originalColors = {};
  for (set in p.sets) {
    var num_pieces = p.sets[set].num;
    var num_orientations = p.sets[set].orientations;

    for (var l = 0; l < num_pieces; l++) {
      for (var o = 0; o < num_orientations; o++) {
        var id = set + "-l" + l + "-o" + o;
        originalColors[id] = svg.getElementById(id).style.fill;
      }
    }
  }

  function displayState(state) {
    for (set in p.sets) {
      for (var l = 0; l < p.sets[set].num; l++) {
        for (var o = 0; o < p.sets[set].orientations; o++) {
          var id = set + "-l" + l + "-o" + o;
          var from = set + "-l" + state[set].permutation[l] + "-o" + ((3 - state[set].orientation[l] + o) % 3);
          svg.getElementById(id).style.fill = originalColors[from];
        }
      }
    }
  }

  function applyMove(oldState, moveString) {
    var newState = {};

    var move = p.moves[moveString];

    for (var set in p.sets) {
      newState[set] = {
        permutation: [],
        orientation: []
      };

      for (var l = 0; l < p.sets[set].num; l++) {

        var a = oldState[set].permutation;
        var b = move[set].permutation[l] - 1;
        newState[set].permutation[l] = a[b];

        var c = oldState[set].orientation[l];
        var d0 = d = move[set].orientation
        var d = (typeof d0 === "undefined") ? 0 : d0[l];

        newState[set].orientation[l] = (d - c)  % 3
      }
    }

    return newState;
  }

  var moves = "RURRRUUURRRFRRUUURRRUUURURRRFFF".split("");

  for (var i in moves) {
    state = applyMove(state, moves[i]);
  }

  displayState(state);
});