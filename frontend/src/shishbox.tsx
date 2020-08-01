/// <reference path='./shishbox.d.ts'/>
import { app, h } from "hyperapp";
import { WebSocketListen } from "hyperapp-fx";
import { Screen } from "./screens/base";
import { Login } from "./screens/login";
import { Lobby } from "./screens/lobby";
import { WriteyDrawey, username } from "./screens/wd";
import { v4 as uuidv4 } from "uuid";

let sess = sessionStorage.getItem("sess");
if (!sess) {
    sess = uuidv4();
    sessionStorage.setItem("sess", sess);
}

let state: State = {
    conn: {
        user: username,
        room: "WDLF",
        sess: sess,
    },
    loading: "Connecting...",
    room: null,
    ws_errors: 0,
    tmp_draw_last: [],
    tmp_text_input: "",
    // room: {"game":"wd","phase":"gameover","players":[{"name":username},{"name":"alien wizard"}],"stacks":[["a cloud over a house","data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAABFUlEQVR4nO3BMQEAAADCoPVP7WsIoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAMBPAABPO1TCQAAAABJRU5ErkJggg=="],["a dragon dancing with an alien","data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAABFUlEQVR4nO3BMQEAAADCoPVP7WsIoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAMBPAABPO1TCQAAAABJRU5ErkJggg=="]],"tick":0}
};

const ResetAction = (state: State) => ({
    ...state,
    error: null,
});

function view(state: State) {
    let screen = null;
    if (state.error !== null) {
        screen = (
            <Screen header={"Error"} footer={<input type="button" value="Leave" onclick={ResetAction} />}>
                {state.error}
            </Screen>
        );
    } else if (state.conn.room === null) {
        screen = <Login state={state} />;
    } else if (state.loading !== null) {
        screen = (
            <Screen header={"Loading"} footer={""}>
                {state.loading}
            </Screen>
        );
    } else if (state.room.phase == "lobby") {
        screen = <Lobby state={state} />;
    } else {
        screen = <WriteyDrawey state={state} />;
    }
    return <body>{screen}</body>;
}

let mySubs = {};

export function socket_name(state: State): string {
    return (
        (window.location.protocol == "https:" ? "wss:" : "ws:") +
        "//" +
        window.location.host +
        "/room" +
        "?room=" +
        state.conn.room +
        "&user=" +
        state.conn.user +
        "&sess=" +
        state.conn.sess +
        "&_=" +
        state.ws_errors
    );
}

function getOpenWebSocketListener(state: State): WebSocketListen {
    let url = socket_name(state);
    if (!mySubs[url]) {
        mySubs[url] = WebSocketListen({
            url: url,
            open(state: State): State {
                return { ...state, loading: "Syncing..." };
            },
            close(state: State): State {
                delete mySubs[url];
                return {
                    ...state,
                    ws_errors: state.ws_errors + 1,
                    loading: "Reconnecting...",
                };
            },
            action(state: State, msg: MessageEvent): State {
                let resp = JSON.parse(msg.data);
                if (resp.error) {
                    return {...state, loading: null, error: resp.error, conn: {...state.conn, room: null}}
                }
                return { ...state, loading: null, room: resp };
            },
            error(state: State, error: Event): State {
                console.log("Error listening to websocket:", error);
                return {
                    ...state,
                    ws_errors: state.ws_errors + 1,
                    loading: "Reconnecting...",
                };
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
    node: document.body,
});
