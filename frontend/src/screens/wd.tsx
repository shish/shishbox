import h from 'hyperapp-jsx-pragma';
import { WebSocketSend } from "hyperapp-fx";
import { Screen, MsgScreen, Sfx, ProgressPie } from "./base";
import { socket_name } from "../shishbox";
import { suggestions } from "../lib/sentences";
import new_round from "url:../static/new-round.mp3";

function getProgress(state: State): number {
    let wd = state.room as WdRoom;
    let lens = wd.stacks.map((s) => s.length);
    let round = Math.min(...lens);
    let working = lens.filter((x) => x == round);
    return (wd.stacks.length - working.length) / wd.stacks.length;
}

/* ====================================================================
= Text Input Screen
==================================================================== */

function SubmitText(state: State) {
    let text = state.tmp_text_input;
    if (text == "") {
        console.log("Not submitting an empty text");
        return state;
    }

    console.log("SubmitText(" + text + ")");

    return [
        {
            ...state,
            tmp_text_input: "",
            loading: "Submitting description...",
        },
        WebSocketSend({
            url: socket_name(state),
            data: JSON.stringify({
                cmd: "submit",
                data: text,
            }),
        }),
    ];
}

const InitInput = ({
    state,
    suggestion,
}: {
    state: State;
    suggestion: string;
}) => (
    <Screen
        settings={state.settings}
        header={"Write an inspiring sentence"}
        right={<ProgressPie value={getProgress(state)} />}
        footer={
            <input
                type="button"
                onclick={SubmitText}
                value={"Submit Sentence"}
            />
        }
    >
        <Sfx state={state} src={new_round} />
        <div class={"inputBlock"}>
            <p>For example:</p>
            {suggestions.map((x) => (
                <p
                    onclick={(state: State) =>
                        ({
                            ...state,
                            tmp_text_input: x,
                        } as State)
                    }
                >
                    "{x}"
                </p>
            ))}
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

const TextInput = ({
    state,
    stack,
}: {
    state: State;
    stack: Array<[string, string]>;
}) => (
    <Screen
        settings={state.settings}
        header={"Describe this"}
        right={<ProgressPie value={getProgress(state)} />}
        footer={
            <input
                type="button"
                onclick={SubmitText}
                value={"Submit Sentence"}
            />
        }
    >
        <Sfx state={state} src={new_round} />
        <div class={"inputBlock"}>
            <img src={stack[stack.length - 1][1]} />
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

function quantize(canvas: HTMLCanvasElement) {
    let ctx = canvas.getContext("2d");
    let data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let n = 0; n < data.data.length; n += 4) {
        // opaque dark is black, all else (ie, transparent and / or bright) is white
        let px = data.data[n + 3] > 0 && data.data[n] < 128 ? 0 : 255;
        data.data[n] = data.data[n + 1] = data.data[n + 2] = px;
        data.data[n + 3] = 255;
    }
    ctx.putImageData(data, 0, 0);
}

function SubmitDraw(state: State) {
    let canvas = document.getElementById("canvas") as HTMLCanvasElement;
    quantize(canvas);

    console.log("SubmitDraw()");
    return [
        {
            ...state,
            loading: "Submitting drawing...",
        },
        WebSocketSend({
            url: socket_name(state),
            data: JSON.stringify({
                cmd: "submit",
                data: canvas.toDataURL(),
            }),
        }),
    ];
}

const Tool = ({ name, icon, mode }) => (
    <i
        class={"fas fa-" + icon + " " + (mode == name ? "selected" : "")}
        onclick={[DrawMode, name]}
    />
);

const DrawInput = ({
    state,
    stack,
    mode,
}: {
    state: State;
    stack: Array<[string, string]>;
    mode: string;
}) => (
    <Screen
        settings={state.settings}
        header={<span>Draw "{stack[stack.length - 1][1]}"</span>}
        right={<ProgressPie value={getProgress(state)} />}
        footer={
            <input
                type="button"
                onclick={SubmitDraw}
                value={"Submit Drawing"}
            />
        }
    >
        <Sfx state={state} src={new_round} />
        <div class={"inputBlock"}>
            <p class={"tools"}>
                <Tool name="brush" icon="paint-brush" mode={mode} />
                &nbsp;&nbsp;&nbsp;&nbsp;
                <Tool name="pen" icon="pencil-alt" mode={mode} />
                &nbsp;&nbsp;&nbsp;&nbsp;
                <Tool name="eraser" icon="eraser" mode={mode} />
            </p>
            <canvas
                id="canvas"
                width={256}
                height={256}
                ontouchstart={DrawMove}
                ontouchmove={DrawMove}
                onmousedown={DrawMove}
                onmousemove={DrawMove}
            />
            <p>
                <a onclick={DrawClear}>Clear</a>
            </p>
        </div>
    </Screen>
);

function DrawMove(state: State, e: MouseEvent | TouchEvent): State {
    e.preventDefault();

    var rect = (e.target as Element).getBoundingClientRect();
    let drawing = true;

    let x = 0,
        y = 0;
    if (e.type == "touchstart" || e.type == "touchmove") {
        let te = e as TouchEvent;
        x = te.changedTouches[0].clientX - rect.left;
        y = te.changedTouches[0].clientY - rect.top;
    } else {
        let me = e as MouseEvent;
        x = me.clientX - rect.left;
        y = me.clientY - rect.top;
        drawing = me.buttons == 1;
    }

    if (drawing) {
        let canvas = document.getElementById("canvas") as HTMLCanvasElement;
        let context = canvas.getContext("2d");
        context.lineJoin = "round";
        if (state.tmp_draw_mode == "brush") {
            context.strokeStyle = "#000";
            context.lineWidth = 6;
        } else if (state.tmp_draw_mode == "pen") {
            context.strokeStyle = "#000";
            context.lineWidth = 3;
        } else if (state.tmp_draw_mode == "eraser") {
            context.strokeStyle = "#FFF";
            context.lineWidth = 9;
        }

        context.beginPath();
        if (e.type == "mousemove" || e.type == "touchmove") {
            context.moveTo(state.tmp_draw_last[0], state.tmp_draw_last[1]);
        } else {
            // mousedown / touchstart
            context.moveTo(x - 1, y - 1);
        }
        context.lineTo(x, y);
        context.closePath();
        context.stroke();
    }

    return { ...state, tmp_draw_last: [x, y] };
}

function DrawMode(state: State, mode: "brush" | "pen" | "eraser"): State {
    return {
        ...state,
        tmp_draw_mode: mode,
    };
}

function DrawClear(state: State): State {
    let canvas = document.getElementById("canvas") as HTMLCanvasElement;
    let context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    return {
        ...state,
        tmp_draw_mode: "brush",
    };
}

/* ====================================================================
= Game Over screen
==================================================================== */

const LeaveAction = (state: State) => ({
    ...state,
    conn: { ...state.conn, room: null },
});

const GameOver = ({ state }: { state: State }) => (
    <Screen
        settings={state.settings}
        header={"Game Finished"}
        right={null}
        footer={<input type="button" value="Leave" onclick={LeaveAction} />}
    >
        <Sfx state={state} src={new_round} />
        {(state.room as WdRoom).stacks.map((stack) => (
            <div class={"inputBlock"}>
                <ol class="summary">
                    {stack.map((sheet) => (
                        <li>
                            {sheet[1].startsWith("data:") ? (
                                <img src={sheet[1]} />
                            ) : (
                                <span>{sheet[1]}</span>
                            )}
                            <div class="author">{sheet[0]}</div>
                        </li>
                    ))}
                </ol>
            </div>
        ))}
    </Screen>
);

/* ====================================================================
= Overall states
==================================================================== */

function myIndex(state: State): number {
    for (let i = 0; i < state.room.players.length; i++) {
        if (state.room.players[i].name == state.conn.user) {
            return i;
        }
    }
    return -1;
}

const Waiting = ({
    state,
    waiting,
}: {
    state: State;
    waiting: Array<boolean>;
}) => (
    <MsgScreen settings={state.settings} header={"Waiting"} footer={""}>
        Waiting for {waiting.join(", ")}...
    </MsgScreen>
);

function mod(n: number, m: number) {
    return ((n % m) + m) % m;
}

export function WriteyDrawey({ state }: { state: State }) {
    let wd = state.room as WdRoom;
    let round = Math.min(...wd.stacks.map((s) => s.length));
    let my_stack = mod(myIndex(state) + round, state.room.players.length);
    let stack = wd.stacks[my_stack];

    let finished = round >= wd.stacks.length;
    let waiting = [];
    for (let i = 0; i < wd.stacks.length; i++) {
        if (wd.stacks[i].length < stack.length) {
            let pid = mod(i - round, state.room.players.length);
            waiting.push(state.room.players[pid].name);
        }
    }

    return finished ? (
        <GameOver state={state} />
    ) : waiting.length > 0 ? (
        <Waiting state={state} waiting={waiting} />
    ) : stack.length == 0 ? (
        <InitInput state={state} suggestion={state.tmp_text_input} />
    ) : stack[stack.length - 1][1].startsWith("data:") ? (
        <TextInput state={state} stack={stack} />
    ) : (
        <DrawInput state={state} mode={state.tmp_draw_mode} stack={stack} />
    );
}
