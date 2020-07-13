/// <reference path='./shishbox.d.ts'/>
import {app, h} from "hyperapp";
import {Login} from "./screens/login";
import {Lobby} from "./screens/lobby";
import {WriteyDrawey} from "./screens/wd";

let state: State = {
    user: {
        name: "",
        color: "#000000",
    },
    room: {
        id: null,
        tick: -1,
        players: [],
    },
    wd: {
        stacks: [
            [],
        ],
        tmp_text_input: "",
        tmp_draw_last: null,
    },
};

function view(state: State) {
    if (state.room.id === null) {
        return <body><Login state={state}/></body>;
    }
    else if (state.room.tick < 0) {
        return <body><Lobby state={state}/></body>;
    }
    else {
        return <body><WriteyDrawey state={state}/></body>;
    }
}

app({
    init: state,
    view: view,
    node: document.body
});
