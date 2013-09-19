
/* lexical grammar */
%lex
%%

/* The parser puts a boundary after the last of a
   set of alternatives, so we get around this by repeating */

\s+                    return 'WHITESPACE'
[0-9]+                 return 'NUMBER'
"-"                    return 'DASH'
Rw|Fw|Uw|Bw|Lw|Dw|Dw   return 'BASE_W'
R|F|U|B|L|D|D          return 'BASE_UPPERCASE'
r|f|u|b|l|d|d          return 'BASE_LOWERCASE'
x|y|z|z                return 'BASE_ROTATION'
M|E|S|S                return 'BASE_SLICE'
"'"                    return 'PRIME'
"."                    return 'PAUSE'
"//"[^\n\r]*           /* ignore comment */
"/*"[^]*?"*/"          /* ignore comment */
[\n\r]                 return 'NEWLINE'
<<EOF>>                return 'EOF'
.                      return 'INVALID'

/lex

%% /* language grammar */

expressions
    : e EOF
        { typeof console !== 'undefined' ? console.log($1) : print($1);
          return $1; }
    ;

LAYER
    : NUMBER
        {$$ = parseInt($1);}
    ;

REPETITION
    : NUMBER
        {$$ = parseInt($1);}
    ;

AMOUNT
    : REPETITION
    | REPETITION PRIME
        {$$ = -$1;}
    | PRIME
        {$$ = -1;}
    ;

BASE_WIDE
    : BASE_W
    | BASE_LOWERCASE
    ;

BASE
    : BASE_WIDE
    | BASE_UPPERCASE
    | BASE_ROTATION
    | BASE_SLICE
    | PAUSE
    ;

BLOCK
    : BASE
        {$$ = {base: $1, amount: 1};}
    | LAYER BASE_UPPERCASE
        {$$ = {base: $2, layer: $1, amount: 1};}
    | LAYER BASE_WIDE
        {$$ = {base: $2, endLayer: $1, amount: 1};}
    | LAYER DASH LAYER BASE_WIDE
        {$$ = {base: $4, startLayer: $1, endLayer: $3, amount: 1};}
    ;

MOVE
    : BLOCK
    | BLOCK AMOUNT
        {$1.amount *= $2; $$ = $1;}
    ;

OPTIONAL_WHITESPACE
    : WHITESPACE
    | /* nothing */
    | NEWLINE
    | OPTIONAL_WHITESPACE OPTIONAL_WHITESPACE
    ;

ALG
    : MOVE
        {$$ = [$1];}
    | ALG OPTIONAL_WHITESPACE MOVE
        {$1.push($3); $$ = $1;}
    ;


e
    : OPTIONAL_WHITESPACE ALG OPTIONAL_WHITESPACE
        {$$ = $2;}
    | OPTIONAL_WHITESPACE
        {$$ = [];}
    ;

