
/* lexical grammar */
%lex
%s id
%%

"Name"                 { this.begin("id"); return "TOKEN_Name" }
"Set"                  return "TOKEN_Set"
"Move"                 { this.begin("id"); return "TOKEN_Move" }
"Solved"               return "TOKEN_Solved"
"End"                  return "TOKEN_End"
<id>[A-Za-z0-9]+       { this.popState(); return "IDENTIFIER" }
[A-Za-z][A-Za-z0-9]*   return "SET_IDENTIFIER"
[0-9]+                 return "INTEGER"
"#"[^\r\n]*            /* ignore comment */
" "                    return "SPACE"
\r?[\n]                return "NEWLINE"
<<EOF>>                return "EOF"
.                      return "INVALID"

/lex

%% /* language grammar */

expressions
    : DEFINITION_FILE EOF
        { return $1; }
    ;

NAME_DEFINITION
    : TOKEN_Name SPACE IDENTIFIER
        {$$ = $IDENTIFIER;}
    ;

SET_DEFINITION
    : TOKEN_Set SPACE SET_IDENTIFIER SPACE INTEGER SPACE INTEGER NEWLINE
        {$$ = [$SET_IDENTIFIER, {num: $5, orientations: $7}];}
    ;

SET_DEFINITIONS
    : SET_DEFINITION
        {$$ = {};               $$[$SET_DEFINITION[0]] = $SET_DEFINITION[1];}
    | SET_DEFINITIONS SET_DEFINITION
        {$$ = $SET_DEFINITIONS; $$[$SET_DEFINITION[0]] = $SET_DEFINITION[1];}
    ;

INTERSTITIAL
    : NEWLINE
    | INTERSTITIAL NEWLINE
    ;

OPTIONAL_NEWLINES
    :
    | INTERSTITIAL
    ;

NUMBERS
    : INTEGER
        {$$ = [parseInt($INTEGER)];}
    | NUMBERS SPACE INTEGER
        {$$ = $NUMBERS.concat([parseInt($INTEGER)]);}
    ;

DEFINITION
    : SET_IDENTIFIER NEWLINE NUMBERS NEWLINE
        {$$ = [$SET_IDENTIFIER, {permutation: $NUMBERS}];}
    | SET_IDENTIFIER NEWLINE NUMBERS NEWLINE NUMBERS NEWLINE
        {$$ = [$SET_IDENTIFIER, {permutation: $3, orientation: $5}];}
    ;

DEFINITIONS
    : DEFINITION
        {$$ = {};           $$[$DEFINITION[0]] = $DEFINITION[1];}
    | DEFINITIONS DEFINITION
        {$$ = $DEFINITIONS; $$[$DEFINITION[0]] = $DEFINITION[1];}
    ;

SOLVED
    : TOKEN_Solved NEWLINE DEFINITIONS TOKEN_End
        {$$ = $DEFINITIONS}
    ;

MOVE
    : TOKEN_Move SPACE IDENTIFIER NEWLINE DEFINITIONS TOKEN_End
        {$$ = [$IDENTIFIER, $DEFINITIONS];}
    ;

MOVES
    : MOVE
        {$$ = {};     $$[$MOVE[0]] = $MOVE[1];}
    | MOVES INTERSTITIAL MOVE
        {$$ = $MOVES; $$[$MOVE[0]] = $MOVE[1];}
    ;

DEFINITION_FILE
    : NAME_DEFINITION INTERSTITIAL SET_DEFINITIONS INTERSTITIAL SOLVED INTERSTITIAL MOVES OPTIONAL_NEWLINES
        {$$ = {name: $NAME_DEFINITION, sets: $SET_DEFINITIONS, moves: $MOVES};}
    ;
