/// <reference path='./shishbox.d.ts'/>
import {app, h} from "hyperapp";
import {WebSocketListen, Http} from "hyperapp-fx";
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
        game: null,
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
    ws_errors: 0,
    loading: false,
};

function view(state: State) {
    if (state.room.id === null) {
        return <body><Login state={state}/></body>;
    }
    else if (state.loading) {
        return <Screen header={"Loading"} />;
    }
    else if (state.room.tick < 0) {
        return <body><Lobby state={state}/></body>;
    }
    else {
        return <body><WriteyDrawey state={state}/></body>;
    }
}

let mySubs = {};

export function refresh(state: State) {
    return [
        { ...state, loading: true },
        Http({
            url: "/state?id=" + state.room.id,
            action: (state, response) => ({
                ...state,
                loading: false,
                queue: response.data.queue,
            }),
            error: (state, response) => ({
                ...state,
                loading: false,
                notification: "" + response,
            }),
        }),
    ];
}

function getOpenWebSocketListener(state: State): WebSocketListen {
    let url =
        (window.location.protocol == "https:" ? "wss:" : "ws:") +
        "//" + window.location.host +
        "/room?id=" + state.room.id +
        "&name=" + state.user.name +
        "&_=" + state.ws_errors;
    if (!mySubs[url]) {
        mySubs[url] = WebSocketListen({
            url: url,
            open(state: State) {
                return refresh(state);
            },
            close(state: State) {
                delete mySubs[url];
                return {
                    ...state,
                    ws_error_count: state.ws_errors + 1,
                };
            },
            action(state: State, msg: MessageEvent) {
                return refresh(state);
            },
            error(state: State, response) {
                console.log("Error listening to websocket:", response);
                return { ...state, ws_error_count: state.ws_errors + 1 };
            },
        });
    }
    return mySubs[url];
}

function subscriptions(state: State) {
    return [state.room.id && getOpenWebSocketListener(state)];
}

app({
    init: state,
    view: view,
    subscriptions: subscriptions,
    node: document.body
});
