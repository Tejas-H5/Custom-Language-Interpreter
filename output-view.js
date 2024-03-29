function OutputView(mountPoint, ctx) {
    const {
        root: component,
        inputPoint,
        outputPoint,
        errorPoint,
        shareBtn
    } = createComponent(
        mountPoint,
        `<div style="flex: 1">
            <div class="heading2 center">Output</div>
            <div style="display: flex; flex-direction: row-reverse; padding-right:20px;">
                <!-- <button --id="shareBtn">share link</button> -->
            </div>
            <div --id="errorPoint"></div>
            <div --id="inputPoint"></div>
            <div --id="outputPoint"></div>
        </div>`
    );

    // shareBtn.addEventListener("click", () => alert("feature not yet implemented"));

    const state = {
        inputsMap: new Map(),
        component: component,
        renderOutputs: (programCtx) => {
            renderErrors(state, errorPoint, programCtx);
            renderInputs(state, inputPoint, programCtx);
            renderOutputs(state, outputPoint, programCtx);
        },
        // hooks
        onInputValueChange: (name, val) => {}
    };

    return state;
}

function renderErrors(state, mountPoint, programCtx) {
    const outputs = [];

    if (programCtx.errors.length > 0) {
        // Display all errors that we encountered
        const errors = programCtx.errors;
    
        // ensure that errors caused by the same code are collapsed into a single
        // error message to save output space
        const errorSpots = new Map();
        for (let i = 0; i < errors.length; i++) {
            const err = errors[i];
            const ast = err.astNode;
            if (!ast) {
                // can't localize this to a particular node.
                continue;
            }
    
            if (!errorSpots.has(ast)) {
                errorSpots.set(ast, []);
            }
    
            const errorList = errorSpots.get(ast);
            errorList.push(err);
        }
    
    
        // create errors
        for (const [ast, errors] of errorSpots.entries()) {
            const astText = programCtx.text.substring(ast.start, ast.end);
            const lineNumber = ast.lineNumber;
            const errorsPlural = errors.length === 1 ? "Error" : `${errors.length} errors`;
            const title = `${errorsPlural} at ln ${lineNumber} ( ${truncate(astText, 30)} )`;
            OutputTextResult(outputs, {
                title: title,
                val: errors[0]
            });
        }
    }


    replaceChildren(mountPoint, outputs);
}

function renderInputs(state, mountPoint, programCtx) {
    // All program inputs should be at the top
    for (const [inputName, inputDataRef] of state.inputsMap.entries()) {
        inputDataRef.shouldDelete = true;
    }

    const newInputsList = [];
    for (const [inputName, inputData] of programCtx.inputs.entries()) {
        if (!state.inputsMap.has(inputName)) {
            // create input if it dont already exist
            const inputUI = CreateInput(newInputsList, inputName, inputData);
            state.inputsMap.set(inputName, {
                ui: inputUI,
                data: inputData,
                shouldDelete: false,
            });

            inputUI.onInputValueChange = () => {
                state.onInputValueChange();
            };
        }

        // make sure the input's state is in sync with the list config data
        const inputDataRef = state.inputsMap.get(inputName);
        inputDataRef.ui.updateState(inputData);
        newInputsList.push(inputDataRef.ui.root)
        // make sure we dont delete this one from the map
        inputDataRef.shouldDelete = false;
    }

    for (const [inputName, inputDataRef] of state.inputsMap.entries()) {
        if (inputDataRef.shouldDelete) {
            state.inputsMap.delete(inputName);
        }
    }

    replaceChildren(mountPoint, newInputsList);
}

function renderOutputs(state, mountPoint, programCtx) {
    const outputs = [];

    // process and show all results, like Titled statements, graphs, etc.
    // we do it like this, so that we can still run unit tests without running side-effects
    if (programCtx.results.length > 0) {
        for (let i = 0; i < programCtx.results.length; i++) {
            const result = programCtx.results[i];
            if (result.rt === RT_PRINT) {
                OutputTextResult(outputs, result, i);
            } else if (result.rt === RT_PLOT) {
                OutputPlotResult(outputs, programCtx, result, i);
            } else if (result.rt === RT_GRAPH) {
                OutputGraphResult(outputs, programCtx, result, i);
            } else {
                console.error("no such result type " + result.rt);
            }
        }
    }

    if (programCtx.programResult.vt !== VT_NULL) {
        OutputTextResult(outputs, {
            title: "Final calculation result",
            val: programCtx.programResult
        });
    }

    replaceChildren(mountPoint, outputs);
}

function OutputTextResult(mountPoint, result, i) {
    const { root, titleRoot, valueRoot } = createComponent(
        mountPoint,
        `<div class="output-text-result">
            <div class="title" --id="titleRoot"></div>
            <div class="value" --id="valueRoot"></div>
        </div>`
    );

    const titleStr = result.title || `result ${i}`;
    titleRoot.textContent = titleStr + ": ";

    const valueStr = thingToString(result.val);
    valueRoot.innerText = valueStr;
    if (result.val.vt === VT_ERROR) {
        valueRoot.classList.add("error");
    }
}

function evaluateFunction(func, domainStart, domainEnd, subdivisions, evalFn) {
    const n = subdivisions + 2;

    const programCtx = createProgramContext("");
    // Initialize the function's capture variables
    programCtx.variables.pushStackFrame();
    for (let i = 0; i < func.captures.length; i++) {
        programCtx.variables.set(programCtx, func.captures[i][0], func.captures[i][1], ASSIGN_DECLARE, true);
    }
    // this number will be the first argument into the function. We are assuming all functions here only take 1 argument
    const fRef = makeNumber(0);
    programCtx.variables.set(programCtx, func.args[0], fRef, ASSIGN_DECLARE);

    for (let i = 0; i <= n; i++) {
        const domainX = lerp(domainStart, domainEnd, i / n);
        fRef.val = domainX;

        programCtx.variables.pushStackFrame();

        // This is not necessarily a number ??? TODO: handle other cases
        const num = evaluateBlock(programCtx, func.body);

        programCtx.variables.popStackFrame();

        if (num.vt === VT_ERROR) {
            return num;
        }

        const domainY = num.val;
        evalFn(domainX, domainY, i);
    }

    programCtx.variables.popStackFrame();
}

function OutputPlotResult(mountPoint, programCtx, result, i) {
    if (result.val && result.val.vt === VT_ERROR) {
        OutputTextResult(mountPoint, result, i);
        return;
    }

    const pathRendererOutput = PathOutputResult(mountPoint);

    pathRendererOutput.setTitle("Plot output " + i + ":");

    function rerenderPlot() {
        pathRendererOutput.renderPaths(
            result.lists.map((rl) => rl.data),
            {
                maintainAspectRatio: true
            }
        );
    }

    let domainStartX, domainStartY;
    const screenDeltaToDomainDelta = (x) => {
        return (x / pathRendererOutput.width) * (pathRendererOutput.maxX - pathRendererOutput.minX);
    };
    onDrag(pathRendererOutput.canvasRoot, {
        onDragStart() {
            domainStartX = pathRendererOutput.domainOffsetX;
            domainStartY = pathRendererOutput.domainOffsetY;
        },
        onDrag(dX, dY) {
            pathRendererOutput.domainOffsetX = domainStartX - screenDeltaToDomainDelta(dX);
            pathRendererOutput.domainOffsetY = domainStartY - screenDeltaToDomainDelta(dY);
            rerenderPlot();
        }
    });

    pathRendererOutput.onForcedRerender = rerenderPlot;
}

function OutputGraphResult(mountPoint, programCtx, result, i) {
    if (result.val && result.val.vt === VT_ERROR) {
        OutputTextResult(mountPoint, result, i);
        return;
    }

    const pathRendererOutput = PathOutputResult(mountPoint);

    const domainStart = result.start.val;
    const domainEnd = result.end.val;
    let domainOffset = 0;

    pathRendererOutput.setTitle("graph of " + result.functions.map((f) => f.name).join(", "));

    function rerenderGraph() {
        // evaluate the functions along the domains.
        // can reduce re-allocations by moving this out of the local fn ??
        const functionEvaluationResultPaths = [];
        for (let fIndex = 0; fIndex < result.functions.length; fIndex++) {
            const results = [];
            functionEvaluationResultPaths.push(results);

            const func = result.functions[fIndex];
            const subdivisions = Math.floor(pathRendererOutput.width);
            const res = evaluateFunction(
                func,
                domainStart + domainOffset,
                domainEnd + domainOffset,
                subdivisions,
                (x, y) => {
                    results.push(x, y);
                }
            );

            if (res && res.vt === VT_ERROR) {
                console.error(res);
            }
        }

        pathRendererOutput.renderPaths(functionEvaluationResultPaths, {
            maintainAspectRatio: false
        });
    }

    pathRendererOutput.onForcedRerender = rerenderGraph;

    const screenDeltaToDomainDeltaX = (x) => (x / pathRendererOutput.width) * (domainEnd - domainStart);

    let domainStartX;
    onDrag(pathRendererOutput.canvasRoot, {
        onDragStart() {
            domainStartX = domainOffset;
        },
        onDrag(dx, dy) {
            domainOffset = domainStartX - screenDeltaToDomainDeltaX(dx);
            rerenderGraph();
        }
    });
}

function PathOutputResult(mountPoint) {
    const { root, canvasRoot, titleRoot } = createComponent(
        mountPoint,
        `<div class="output-graph-result">
            <div class="title" --id="titleRoot"></div>
            <div class="output-graph-result-canvas-container">
                <canvas --id="canvasRoot"></canvas>
            </div>
        </div>`
    );

    /** @type { CanvasRenderingContext2D } */
    const canvasRootCtx = canvasRoot.getContext("2d");
    canvasRootCtx.translate(0.5, 0.5); // allows 1-width lines to actually be 1 pixel wide
    const state = {
        // calculated after a render
        width: 0,
        height: 0,
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
        domainOffsetX: 0,
        domainOffsetY: 0,
        renderPaths(paths, { maintainAspectRatio }) {
            renderPaths2D(state, paths, canvasRootCtx, {
                maintainAspectRatio: maintainAspectRatio
            });
        },
        setTitle: (title) => {
            titleRoot.textContent = title;
        },
        canvasRoot: canvasRoot,
        onForcedRerender: () => {},
        domainXToScreenX: (x) => {
            return ((x - (state.minX + state.domainOffsetX)) / (state.maxX - state.minX)) * state.width;
        },
        domainYToScreenY: (y) => {
            return (1 - (y - state.minY + state.domainOffsetY) / (state.maxY - state.minY)) * state.height;
        }
    };

    onResize(canvasRoot.parentElement, (newWidth, newHeight) => {
        state.width = newWidth;
        state.height = newHeight;
        canvasRoot.width = state.width;
        canvasRoot.height = state.height;

        state.onForcedRerender();
    });

    return state;
}

/** @param {CanvasRenderingContext2D} canvasRootCtx */
function renderPaths2D(state, pointLists, canvasRootCtx, { maintainAspectRatio }) {
    // Find graph extends
    for (let i = 0; i < pointLists.length; i++) {
        const path = pointLists[i];
        for (let j = 0; j < path.length; j += 2) {
            const x = path[j + 0];
            const y = path[j + 1];

            if (i === 0 && j === 0) {
                state.minX = x;
                state.maxX = x;
                state.minY = y;
                state.maxY = y;
            }

            state.minX = x < state.minX ? x : state.minX;
            state.minY = y < state.minY ? y : state.minY;
            state.maxX = x > state.maxX ? x : state.maxX;
            state.maxY = y > state.maxY ? y : state.maxY;
        }
    }

    if (maintainAspectRatio) {
        // domain X-Y bound aspect ratio needs to match the screen aspect ratio.
        // we would rather increase the bounds than decrease them.

        const xLen = state.maxX - state.minX;
        const yLen = state.maxY - state.minY;

        const targetAspectRatio = state.width / state.height;
        if (xLen / yLen > targetAspectRatio) {
            // increase Y bounds
            const midpointY = state.minY + (state.maxY - state.minY) / 2;
            const wantedYLen = xLen / targetAspectRatio;

            state.minY = midpointY - wantedYLen / 2;
            state.maxY = midpointY + wantedYLen / 2;
        } else {
            // increase X bounds
            const midpointX = state.minX + (state.maxX - state.minX) / 2;
            const wantedXLen = targetAspectRatio * yLen;

            state.minX = midpointX - wantedXLen / 2;
            state.maxX = midpointX + wantedXLen / 2;
        }
    }

    let {
        minX,
        minY,
        maxX,
        maxY,
        domainXToScreenX,
        domainYToScreenY,
        width: canvasWidth,
        height: canvasHeight,
        canvasRoot
    } = state;


    const cssVar = (name) => {
        const val = getComputedStyle(canvasRoot).getPropertyValue(name);
        return val;
    }

    // extend bounds by a tiny percent so the graph lines don't get cut off
    {
        const extendX = (maxX - minX) * 0.01;
        minX -= extendX;
        maxX += extendX;

        const extendY = (maxY - minY) * 0.01;
        minY -= extendY;
        maxY += extendY;
    }

    // start rendering the graph.

    // graph bg
    // background
    {
        canvasRootCtx.fillStyle = cssVar(`--bg-col`);
        canvasRootCtx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // Draw each of the paths
    for (let i = 0; i < pointLists.length; i++) {
        const path = pointLists[i];

        canvasRootCtx.strokeStyle = `hsl(${(360 * i) / pointLists.length}, 100%, 50%)`;
        canvasRootCtx.lineWidth = 2;
        canvasRootCtx.beginPath();

        for (let j = 0; j < path.length; j += 2) {
            const resultX = path[j + 0];
            const resultY = path[j + 1];

            const x = domainXToScreenX(resultX);
            const y = domainYToScreenY(resultY);

            if (j === 0) {
                canvasRootCtx.moveTo(x, y);
            } else {
                canvasRootCtx.lineTo(x, y);
            }
        }

        canvasRootCtx.stroke();
    }

    // grid
    {
        canvasRootCtx.strokeStyle = cssVar("--gridline-col")
        canvasRootCtx.lineWidth = 1;

        const getGoodGridSpacing = (width) => {
            const nearestPowerOf2 = Math.pow(2, Math.floor(Math.log2(width) / Math.log2(2)) - 1);
            const nearestPowerOf5 = Math.pow(5, Math.floor(Math.log2(width) / Math.log2(5)) - 1);
            const nearestPowerOf10 = Math.pow(10, Math.floor(Math.log2(width) / Math.log2(10)) - 1);

            const spacingCounts = [nearestPowerOf2, nearestPowerOf5, nearestPowerOf10];
            spacingCounts.sort();

            if (width / spacingCounts[2] > 5) return spacingCounts[2];
            if (width / spacingCounts[1] > 5) return spacingCounts[1];

            return spacingCounts[0];
        };

        canvasRootCtx.beginPath();
        const gridXSpacing = getGoodGridSpacing(maxX - minX);
        const gridYSpacing = getGoodGridSpacing(maxY - minY);
        const startX = Math.floor(minX / gridXSpacing) * gridXSpacing;
        for (let x = startX; x < maxX; x += gridXSpacing) {
            const screenX = domainXToScreenX(x);
            canvasRootCtx.moveTo(screenX, 0);
            canvasRootCtx.lineTo(screenX, canvasHeight);
        }
        const startY = Math.floor(minY / gridYSpacing) * gridYSpacing;
        for (let y = startY; y < maxY; y += gridYSpacing) {
            const screenY = domainYToScreenY(y);
            canvasRootCtx.moveTo(0, screenY);
            canvasRootCtx.lineTo(canvasWidth, screenY);
        }
        canvasRootCtx.stroke();

        // Draw axes numbers
        {
            const round = (x) => (Math.round(x * 10) / 10).toFixed(1);

            const fontSize = 14;
            canvasRootCtx.font = `${fontSize}px monospace`;
            canvasRootCtx.fillStyle = cssVar("--fg-col");
            canvasRootCtx.textAlign = "center";

            for (let x = startX; x < maxX; x += gridXSpacing) {
                canvasRootCtx.fillText(round(x), domainXToScreenX(x), domainYToScreenY(minY) - fontSize + 4);
            }

            canvasRootCtx.textAlign = "left";
            for (let y = startY; y < maxY; y += gridYSpacing) {
                canvasRootCtx.fillText(round(y), domainXToScreenX(minX) + 10, domainYToScreenY(y) - 2);
            }
        }
    }
}

function CreateInput(mountPoint, inputName, inputData) {
    const state = {
        onInputValueChange: () => {},
        updateState: (inputData) => {},
        root: null
    };

    if (inputData.it === IT_SLIDER) {
        createSlider(state, mountPoint, inputName, inputData);
    } else {
        console.error("unknown input type: " + inputData.it);
        return;
    }

    return state;
}

function createSlider(state, mountPoint, inputName, inputData) {
    const { root, nameRoot, input } = createComponent(
        mountPoint,
        `<div class="result-input flex-row">
            <div --id="nameRoot" class="title"></div>
            <div class="flex-1">
                <input --id="input" type="range" style="width: 100%;"></input>
            </div>
        </div>`
    );

    nameRoot.textContent = inputName;

    const updateState = (inputData, setValue) => {
        state.inputData = inputData;
        state.minValue = inputData.minValue || 0;
        state.maxValue = inputData.maxValue || 1;
        state.stepValue = inputData.stepValue || 0.001;
    
        // HTML range inputs only have integer values
        const intMin = state.minValue / state.stepValue;
        const intMax = state.maxValue / state.stepValue;
    
        input.setAttribute("min", intMin);
        input.setAttribute("max", intMax);

        if (setValue) {
            input.setAttribute("value", inputData.currentValue.val / state.stepValue);
        }
    }

    updateState(inputData, true)
    state.updateState = (inputData) => {
        updateState(inputData, false)
    }

    input.oninput = () => {
        state.inputData.currentValue.val = input.value * state.stepValue;
        state.onInputValueChange();
    };

    state.root = root;
}
