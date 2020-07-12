/// <reference path='./shishbox.d.ts'/>
import {app, h} from "hyperapp";
import {Login} from "./screens/login";
import {WriteyDrawey} from "./screens/wd";

let state: State = {
    user: {
        name: "",
        color: "#000000",
    },
    game: {
        id: "1234",
        tick: -1,
        players: [
            {name: "Shish"},
        ],
        stacks: [
            [],
        ],
    },
    tmp_text_input: "",
    tmp_draw_input: [],
    tmp_draw_pressed: false,
};

function view(state: State) {
    if (state.game === null) {
        return <body><Login state={state}/></body>;
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
