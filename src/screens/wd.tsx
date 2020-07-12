import {h} from "hyperapp";
import {Screen} from "./base";

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

const people = ["ninja"];
const suggestions = shuffleArray([
    "King of the frogs",
    "Ninja birthday party",
    "Dancing horses",
    "Cat romance",
    "The best cake",
    "Royal family",
    "Rocket race",
    ""
]);

function SubmitText(state: State): State {
    let stacks = state.game.stacks;
    console.log("SubmitText("+state.tmp_text_input+")");
    stacks[0].push(state.tmp_text_input);
    return {
        ...state,
        game: {
            ...state.game,
            tick: state.game.tick+1,
            stacks: stacks,
        },
        tmp_text_input: "",
    }
}

function SubmitDraw(state: State): State {
    let stacks = state.game.stacks;
    let canvas = document.getElementById("canvas");
    console.log("SubmitDraw()");
    stacks[0].push(canvas.toDataURL());
    return {
        ...state,
        game: {
            ...state.game,
            tick: state.game.tick+1,
            stacks: stacks,
        },
        tmp_draw_input: [],
    }
}

const RenderText = ({data}) => (
    <h2>{data}</h2>
);
const RenderDraw = ({data}) => (
    <img src={data} />
);

const RenderStack = ({stack}: { stack: Array<string> }) => (
    <p>{stack.map((x, i) => (i % 2 == 0 ? <RenderText data={x} /> : <RenderDraw data={x} />))}</p>
);

const InitInput = ({stack}: { stack: Array<string> }) => (
    <div>
        <h2>Write an insipring sentence</h2>
        <div class={"inputBlock"}>
            <p>For example:</p>
            {suggestions.splice(0, 5).map((x) => <p>"{x}"</p>)}
        </div>
        <input 
            class={"textInput"}
            oninput={(state: State, event: FormInputEvent) =>
                ({
                    ...state,
                    tmp_text_input: event.target.value,
                } as State)
            }
        />
        <button onclick={SubmitText}>Submit Sentence</button>
    </div>
);

const TextInput = ({stack}: { stack: Array<string> }) => (
    <div>
        <h2>Describe this</h2>
        <img src={stack[stack.length-1]} />
        <input
            class={"textInput"}
            oninput={(state: State, event: FormInputEvent) =>
                ({
                    ...state,
                    tmp_text_input: event.target.value,
                } as State)
            }
        />
        <button onclick={SubmitText}>Submit Sentence</button>
    </div>
);

const DrawInput = ({stack}: { stack: Array<string> }) => (
    <div>
        <h2>Draw "{stack[stack.length-1]}"</h2>
        <div class={"inputBlock"}>
            <canvas
                id="canvas"
                width={256}
                height={256}
                ontouchstart={DrawStart}
                ontouchmove={DrawCont}
                ontouchend={DrawEnd}
                ontouchleave={DrawEnd}

                onmousedown={DrawStart}
                onmousemove={DrawCont}
                onmouseup={DrawEnd}
                onmouseleave={DrawEnd}
            />
            <p><a onclick={DrawClear}>Clear</a></p>
        </div>
        <button onclick={SubmitDraw}>Submit Drawing</button>
    </div>
);

function redraw(moves) {
    let canvas = document.getElementById("canvas");
    let context = canvas.getContext("2d");
    context.strokeStyle = "#000";
    context.lineJoin = "round";
    context.lineWidth = 6;

    for(var i=0; i < moves.length; i++)
    {
      context.beginPath();
      if(moves[i][2] && i){
        context.moveTo(moves[i-1][0], moves[i-1][1]);
       }else{
        context.moveTo(moves[i][0], moves[i][1]);
       }
       context.lineTo(moves[i][0], moves[i][1]);
       context.closePath();
       context.stroke();
    }
}

function UpdateDrawing(state: State, e: MouseEvent, start: boolean, link: boolean): State {
    e.preventDefault();

    redraw(state.tmp_draw_input);

    let pressed = state.tmp_draw_pressed;
    if(start) {pressed = true;}

    let inp = state.tmp_draw_input;
    if (pressed) {
        var rect = e.target.getBoundingClientRect();
        let point = [
            e.clientX - rect.left,
            e.clientY - rect.top,
            link
        ];
        inp.push(point);
    }

    return {
        ...state,
        tmp_draw_pressed: pressed,
        tmp_draw_input: inp,
    };
}

function DrawStart(state: State, e: MouseEvent): State {
    return UpdateDrawing(state, e, true, false);
}

function DrawCont(state: State, e: MouseEvent): State {
    return UpdateDrawing(state, e, false, true);
}

function DrawEnd(state: State): State {
    return {...state, tmp_draw_pressed: false};
}

function DrawClear(state: State): State {
    redraw([]);
    return {...state, tmp_draw_input: []};
}

export const WriteyDrawey = ({state}: { state: State }) => (
    <Screen title={"Room Code: "+state.game.id}>
        {state.game.stacks[0].length == 0 ?
            <InitInput stack={state.game.stacks[0]} /> :
            state.game.stacks[0].length % 2 == 0 ?
                <TextInput stack={state.game.stacks[0]} /> :
                <DrawInput stack={state.game.stacks[0]} />
        }
        <p>{state.tmp_draw_input.map(x=><span><br/>{x[0]},{x[1]}={x[2]}</span>)}</p>
    </Screen>
);