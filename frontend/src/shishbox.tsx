/// <reference path='./shishbox.d.ts'/>
import {app, h} from "hyperapp";
import {WebSocketListen} from "hyperapp-fx";
import {Screen} from "./screens/base";
import {Login} from "./screens/login";
import {Lobby} from "./screens/lobby";
import {WriteyDrawey} from "./screens/wd";
import { v4 as uuidv4 } from 'uuid';

let sess = sessionStorage.getItem('sess');
if(!sess) {
    sess = uuidv4();
    sessionStorage.setItem('sess', sess);
}

// Get saved data from sessionStorage

let state: State = {
    conn: {
        user: "Shish",
        room: "12345",
        sess: sess,
    },
    loading: "Connecting...",
    room: null,
    ws_errors: 0,
    tmp_draw_last: [],
    tmp_text_input: "",
};

function view(state: State) {
    if (state.conn.room === null) {
        return <body><Login state={state}/></body>;
    }
    else if (state.loading !== null) {
        return <body><Screen header={"Loading"} footer={""}>{state.loading}</Screen></body>;
    }
    else if (state.room.lobby) {
        return <body><Lobby state={state}/></body>;
    }
    else {
        return <body><WriteyDrawey state={state}/></body>;
    }
}

let mySubs = {};

export function socket_name(state: State): string {
    return (window.location.protocol == "https:" ? "wss:" : "ws:") +
        "//" + window.location.host +
        "/room" +
        "?room=" + state.conn.room +
        "&user=" + state.conn.user +
        "&sess=" + state.conn.sess +
        "&_=" + state.ws_errors;
}

function getOpenWebSocketListener(state: State): WebSocketListen {
    let url = socket_name(state);
    if (!mySubs[url]) {
        console.log("New socket:", url);
        mySubs[url] = WebSocketListen({
            url: url,
            open(state: State): State {
                return { ...state, loading: "Syncing..." };
            },
            close(state: State): State {
                console.log("Socket closed")
                delete mySubs[url];
                return { ...state, ws_errors: state.ws_errors + 1, loading: "Reconnecting..." };
            },
            action(state: State, msg: MessageEvent): State {
                console.log("ws.action(", msg.data, ")");
                return { ...state, loading: null, room: JSON.parse(msg.data) };
            },
            error(state: State, error: Event): State {
                console.log("Error listening to websocket:", error);
                return { ...state, ws_errors: state.ws_errors + 1, loading: "Reconnecting..." };
            },
        });
    }
    return mySubs[url];
}

function subscriptions(state: State) {
    return [state.conn.room && getOpenWebSocketListener(state)];
}

app({
    init: state,
    view: view,
    subscriptions: subscriptions,
    node: document.body
});
