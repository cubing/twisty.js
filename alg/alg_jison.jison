
/* lexical grammar */
%lex
%s timestamp
%%


[^\S\r\n]+             return "WHITESPACE"
[0-9]+                 return "NUMBER"

(Rw|Fw|Uw|Bw|Lw|Dw)    return "BASE_W"
(R|F|U|B|L|D)          return "BASE_UPPERCASE"
(r|f|u|b|l|d)          return "BASE_LOWERCASE"
(x|y|z)                return "BASE_ROTATION"
(M|E|S)                return "BASE_SLICE"

"'"                    return "PRIME"

[\n\r]                 return "NEWLINE"

<<EOF>>                return "EOF"
.                      return "INVALID"

/lex

%% /* language grammar */

expressions
    : TOP_LEVEL_ALG EOF
        { return $TOP_LEVEL_ALG; }
    | OPTIONAL_WHITESPACE EOF
        { return []; }
    ;

LAYER
    : NUMBER
        {$$ = parseInt($NUMBER);}
    ;

REPETITION
    : NUMBER
        {$$ = parseInt($NUMBER);}
    ;

AMOUNT
    : REPETITION
    | REPETITION PRIME
        {$$ = -$REPETITION;}
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
    ;

BLOCK
    : BASE
        {$$ = {type: "move", base: $BASE};}
    | LAYER BASE_UPPERCASE
        {$$ = {type: "move", base: $BASE_UPPERCASE, layer: $LAYER};}
    | LAYER BASE_WIDE
        {$$ = {type: "move", base: $BASE_WIDE, endLayer: $LAYER};}
    ;


OPTIONAL_WHITESPACE
    : WHITESPACE
    | /* nothing */
    | OPTIONAL_WHITESPACE OPTIONAL_WHITESPACE
    ;

REPEATABLE
    : BLOCK
    | OPEN_PARENTHESIS NESTED_ALG CLOSE_PARENTHESIS
        {$$ = {"type": "group", "A": $NESTED_ALG};}
    ;

REPEATED
    : REPEATABLE
        {$REPEATABLE.amount = 1; $$ = $REPEATABLE;}
    | REPEATABLE AMOUNT
        {$REPEATABLE.amount = $AMOUNT; $$ = $REPEATABLE;}
    | NEWLINE
        {$$ = {type: "move", base: ".", amount: 1};}
    ;

NESTED_ALG
    : OPTIONAL_WHITESPACE REPEATED OPTIONAL_WHITESPACE
        {$$ = [$REPEATED]; $REPEATED.location = @REPEATED;}
    | NESTED_ALG NESTED_ALG
        {$$ = $1.concat($2);}
    ;

TOP_LEVEL_ALG
    : NESTED_ALG
    ;