
/* lexical grammar */
%lex
%%

/* The parser puts a boundary after the last of a
   set of alternatives, so we get around this by repeating */

[^\S\r\n]+             return 'WHITESPACE'
[0-9]+                 return 'NUMBER'
"-"                    return 'DASH'
(Rw|Fw|Uw|Bw|Lw|Dw)    return 'BASE_W'
(R|F|U|B|L|D)          return 'BASE_UPPERCASE'
(r|f|u|b|l|d)          return 'BASE_LOWERCASE'
(x|y|z)                return 'BASE_ROTATION'
(M|E|S)                return 'BASE_SLICE'
"'"                    return 'PRIME'
"."                    return 'PAUSE'
"//"[^\n\r]*           /* ignore comment */
"/*"[^]*?"*/"          /* ignore comment */
[\n\r]                 return 'NEWLINE'
"["                    return 'OPEN_BRACKET'
"]"                    return 'CLOSE_BRACKET'
"("                    return 'OPEN_PARENTHESIS'
")"                    return 'CLOSE_PARENTHESIS'
","                    return 'COMMA'
":"                    return 'COLON'
<<EOF>>                return 'EOF'
.                      return 'INVALID'

/lex

%% /* language grammar */

expressions
    : ALG EOF
        { return $1; }
    | OPTIONAL_WHITESPACE EOF
        { return []; }
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
        {$$ = {type: "move", base: $1};}
    | LAYER BASE_UPPERCASE
        {$$ = {type: "move", base: $2, layer: $1};}
    | LAYER BASE_WIDE
        {$$ = {type: "move", base: $2, endLayer: $1};}
    | LAYER DASH LAYER BASE_WIDE
        {$$ = {type: "move", base: $4, startLayer: $1, endLayer: $3};}
    ;

OPTIONAL_WHITESPACE
    : WHITESPACE
    | /* nothing */
    | OPTIONAL_WHITESPACE OPTIONAL_WHITESPACE
    ;

REPEATABLE
    : BLOCK
    | OPEN_BRACKET ALG COMMA ALG CLOSE_BRACKET
        {$$ = {"type": "commutator", "A": $2, "B": $4};}
    | OPEN_BRACKET ALG COLON ALG CLOSE_BRACKET
        {$$ = {"type": "conjugate", "A": $2, "B": $4};}
    | OPEN_PARENTHESIS ALG CLOSE_PARENTHESIS
        {$$ = {"type": "group", "A": $2};}
    ;

REPEATED
    : REPEATABLE
        {$1.amount = 1; $$ = $1;}
    | REPEATABLE AMOUNT
        {$1.amount = $2; $$ = $1;}
    | NEWLINE
        {$$ = {type: "move", base: ".", amount: 1};}
    ;

ALG
    : OPTIONAL_WHITESPACE REPEATED OPTIONAL_WHITESPACE
        {$$ = [$2]; $REPEATED.location = @REPEATED;}
    | ALG ALG
        {$$ = $1.concat($2);}
    ;