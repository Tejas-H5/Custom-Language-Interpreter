# What is this?
A calculator made in javascript. 
It is a calculator that was made by actually parsing an AST, and not by calling `eval` like you see in all those javascript tutorials.
It isn't actually supposed to be mathematically accurate, it is just practice for writing a parser and an evaluator.
I find it much faster to iterate on javascript + HTML than I do with anything else

### Current feature set:
- Operators
    - `+ - * / %`
- Grouping things with braces
- Negative numbers (new)
    - yeah I forgot to add this the first time around
- Builtin functions
    - `sin cos tan ceil floor .....`
- variables
- ternary operator like condition ? x : y
- tensors like `T(1200, 700)`

### What do I want to add next?
- For loop construct.
    - classic init, check, iterate c style
    - also range based i := some list type thing

- Functions

- array programming like in Sverchok blender addon. basically, a node that was like f(x : float) -> float would implicitly be f(x : float[]) -> float[] by applying the function elementwise, and the number of dimensions is infinite.
    - If a function expects types (T1, T2, ... , Tn), then we first check if the arguments passed in were correct, and evaluate normally.
    Else, we see which arguments are of type T1[][]..., and then we go ahead and invoke the function multiple times for every value of T1 in the array, for each argument.
        - order can be non-deterministic

- user defined functions



- Some way to draw things
- quick optimization : store rows as vectors, not individual number objects 
    - or if there was a way to just represent everything as one massive 1d array, that would be nice
    - TODO: make everything a tensor, would simplify a lot of the code

- A C++ port ?
- Hex, binary, custom base numbers

- easy optimizations: 
- Times
    - like `1:20am` and then we can add/subtract them to get durations and such
    - Also dates
    - And numbers with arbitrary units
- Big numbers. unlimited size numbers. and manually implement arithmetic
    - Might just yoink someone else's library for this. I can't be bothered
    - This is quite hard to get right, I will try again later

### What do I want to remove?
- `[ERROR]: Argument 0 to function sin was of type ERROR, but it wants NUMBER`
    - such a dumb error. but it is hard to remove. or maybe it is easy and I haven't thought about it enough. 

