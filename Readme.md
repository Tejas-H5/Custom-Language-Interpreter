# A general-purpose programming-based calculator (try it [here](https://tejas-h5.github.io/Custom-Language-Interpreter/calculator.html))

I often find that when I am programming something and need to test a calculation, or if I need a calculator for any other reason, I will often reach for the search-bar in a new tab in the browser, because a single text-field where I can type my equation is a much better interface than what is provided on most calculator apps.

The problem is that this is actually quite bad. It doesn't work when you don't have access to the internet, and I can't do any more complicated calculations.
It also isn't enough for most visualizations, which I end up reaching for something like the Desmos graphing calculator anyway. 
That solution also isn't the best, because there are a lot of programming constructs that simply don't exist there. 
It may also be worth using a calculator that has all of the floating-point quirks that I would normally encounter when I am programming a game or whatever.

For this and other reasons, I have decided to spend some time working on this calculator. Even though it is really a programming language, I don't call it that, because it isn't for writing programs. It is for doing prototyping simple algorithms or even a small part of a larger algorithm I am working on, and seeing INSTANT feedback - exactly what I may have been using a calculator for earlier.
If you find you are writing a large program to the point where the web interface is lagging, please raise a github issue. 
But also consider moving whatever it is you are working on to a real programming language.

## Immediate next steps

- !! Have a thing in the middle the screen to resize code/output windows

- A button to share a link to a computation. May run into a URL length limit but thats fine.

- Critical bugfixes.
    - Better error reporting from the parser. Right now, our error is "couldn't read blah". really, as we are parsing, we should keep track of which error was furthest along in the code, and then report that one instead, as that will probably be what we want to fix.
    This has happened, but have been unable to reproduce it. Will come back to this later

- Still not obvious that matrix multiplication and dot product is ** and not *, need to fix this somehow

- Set up NodeJS so that we can use modules, and have better tooling in general. This project started off being fun, but it is a pain in the ass to read this code after working with a React codebase


## Overarching Feature plans

Note: As there are other things I want to be working on, I may never get to these:

- 2D/3D wireframe/mesh visualisation
    - vector/matrix/quaternion funcs
        - Tensors already exist, and matrix multiplication already exists (I couldn't figure out Tensor multiplication, also I don't know how useful that would be to sink a couple weeks into)
- Audio generation and visualisation
- Some way to bind a program variable to time and rerun the program with requestAnimationFrame
- Some way to bind a program variable to key inputs?

## Known issues
- Interpreter errors are not being propagated correctly at the moment
- A lot more
