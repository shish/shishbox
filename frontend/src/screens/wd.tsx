import {h} from "hyperapp";
import {WebSocketSend} from "hyperapp-fx";
import Sentence from "sentence-engine";
import {Screen} from "./base";
import {socket_name} from "../shishbox";


/* ====================================================================
= Example sentences
==================================================================== */

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
const templates = [
    // "{race} {job}",
    // "{animal} {role}",
    "{people} {event}",
    "{a-people} dancing with {a-people}",
    "romance between {a-people} and {a-people}",
    "the best {food}",
    "{a-job} riding {a-animal}",
    "{a-people} driving {a-car}",
    "{a-people} eating {a-food}",
    "race between {a-race} and {a-job}",
    "{a-job} and {a-job} having a cooking battle",
    "the world's most beautiful {job}",
    "{a-weather} over {a-building}",
];
let vocabulary = {
    race: ["robot", "elf", "alien", "skeleton", "dragon", "ghost"],
    job: ["chef", "wizard", "ninja", "pirate", "fairy", "clown", "hacker", "superhero", "angel", "demon", "astronaut"],
    animal: ["frog", "sheep", "cat", "monkey", "worm", "unicorn", "bird", "turtle", "bat", "octopus"],
    role: ["king", "queen", "prince", "princess"],
    food: ["cake", "pie", "banana", "carrot", "pumpkin", "pear", "cheese", "flower"],
    event: ["birthday party", "job interview"],
    building: ["hotel", "house", "bank", "hospital", "spaceship"],
    weather: ["cloud", "rainbow"],
    car: ["car", "truck", "bus", "golf cart", "monster truck"],
}
vocabulary["people"] = vocabulary["race"].concat(vocabulary["animal"])
const suggestions = shuffleArray(templates.map((t) => Sentence(t, vocabulary).get())).splice(0, 5);
export const username = Sentence("{race} {job}", vocabulary).get();

/* ====================================================================
= Text Input Screen
==================================================================== */

function SubmitText(state: State) {
    let wd = state.room as WdRoom;
    let text = state.tmp_text_input;
    if(text == "") {
        console.log("Not submitting an empty text");
        return state;
    }

    console.log("SubmitText("+text+")");

    let new_state: State = {
        ...state,
        room: wd,
        tmp_text_input: "",
    };
    return [new_state, WebSocketSend({url: socket_name(state), data: JSON.stringify({
        cmd: "submit",
        data: text
      })})];
}

const InitInput = ({stack, suggestion}: { stack: Array<string>; suggestion: string }) => (
    <Screen 
        header={"Write an insipring sentence"}
        footer={<input type="button" onclick={SubmitText} value={"Submit Sentence"} />}
    >
        <div class={"inputBlock"}>
            <p>For example:</p>
            {suggestions.map((x) =>
                <p onclick={(state: State) => ({
                    ...state,
                    tmp_text_input: x,
                } as State)}>"{x}"</p>
            )}
        </div>
        <input 
            type={"text"}
            value={suggestion}
            placeholder={"Be imaginative!"}
            oninput={(state: State, event: FormInputEvent) =>
                ({
                    ...state,
                    tmp_text_input: event.target.value,
                } as State)
            }
        />
    </Screen>
);

const TextInput = ({stack}: { stack: Array<string> }) => (
    <Screen
        header={"Describe this"}
        footer={<input type="button" onclick={SubmitText} value={"Submit Sentence"} />}
    >
        <div class={"inputBlock"}>
            <img src={stack[stack.length-1]} />
        </div>
        <input
            type={"text"}
            oninput={(state: State, event: FormInputEvent) =>
                ({
                    ...state,
                    tmp_text_input: event.target.value,
                } as State)
            }
        />
    </Screen>
);


/* ====================================================================
= Draw Input Screen
==================================================================== */

function SubmitDraw(state: State) {
    let wd = state.room as WdRoom;
    let canvas = document.getElementById("canvas") as HTMLCanvasElement;
    console.log("SubmitDraw()");
    return [state, WebSocketSend({url: socket_name(state), data: JSON.stringify({
        cmd: "submit",
        data: canvas.toDataURL()
      })})];
}

const DrawInput = ({stack}: { stack: Array<string> }) => (
    <Screen
        header={<span>Draw "{stack[stack.length-1]}"</span>}
        footer={<input type="button" onclick={SubmitDraw} value={"Submit Drawing"} />}
    >
        <div class={"inputBlock"}>
            <p>&nbsp;</p>
            <canvas
                id="canvas"
                width={256}
                height={256}
                ontouchstart={DrawMove}
                ontouchmove={DrawMove}
                onmousedown={DrawMove}
                onmousemove={DrawMove}
            />
            <p><a onclick={DrawClear}>Clear</a></p>
        </div>
    </Screen>
);

function DrawMove(state: State, e: MouseEvent|TouchEvent): State {
    e.preventDefault();

    var rect = (e.target as Element).getBoundingClientRect();
    let drawing = true;

    let x=0, y=0;
    if(e.type == "touchstart" || e.type == "touchmove") {
        let te = e as TouchEvent;
        x = te.changedTouches[0].clientX - rect.left;
        y = te.changedTouches[0].clientY - rect.top;
    }
    else {
        let me = e as MouseEvent;
        x = me.clientX - rect.left;
        y = me.clientY - rect.top;
        drawing = false; // when should drawing be true??
    }

    if(drawing) {
        let canvas = document.getElementById("canvas") as HTMLCanvasElement;
        let context = canvas.getContext("2d");
        context.strokeStyle = "#000";
        context.lineJoin = "round";
        context.lineWidth = 6;
    
        context.beginPath();
        if(e.type == "mousemove" || e.type == "touchmove") {
            context.moveTo(state.tmp_draw_last[0], state.tmp_draw_last[1]);
        }
        else { // mousedown / touchstart
            context.moveTo(x-1, y-1);
        }
        context.lineTo(x, y);
        context.closePath();
        context.stroke();
    }

    return { ...state, tmp_draw_last: [x, y] };
}

function DrawClear(state: State): State {
    let canvas = document.getElementById("canvas") as HTMLCanvasElement;
    let context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    return state;
}


/* ====================================================================
= Overall states
==================================================================== */

export function WriteyDrawey({state}: { state: State }) {
    let wd = state.room as WdRoom;
    return wd.stacks[0].length == 0 ?
        <InitInput suggestion={state.tmp_text_input} stack={wd.stacks[0]} /> :
        wd.stacks[0].length % 2 == 0 ?
            <TextInput stack={wd.stacks[0]} /> :
            <DrawInput stack={wd.stacks[0]} /> ;
}
