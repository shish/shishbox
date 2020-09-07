import { h } from "hyperapp";
import { WebSocketSend } from "hyperapp-fx";
import { MsgScreen } from "./base";
import { socket_name } from "../shishbox";

const StartAction = (state: State) => [
    { ...state, loading: "Starting game..." } as State,
    WebSocketSend({
        url: socket_name(state),
        data: JSON.stringify({
            cmd: "start",
            data: "",
        }),
    }),
];

const LeaveAction = (state: State) => ({
    ...state,
    conn: {
        ...state.conn,
        room: null,
    }
} as State);

export const Lobby = ({ state }: { state: State }) => (
    <MsgScreen
        settings={state.settings}
        header={"Writey Drawey"}
        footer={
            (state.room.players[0].name == state.conn.user && state.room.players.length > 1) ?
                <input type="button" value="Start Game" onclick={StartAction} /> :
                <input type="button" value="Leave" onclick={LeaveAction} />
        }
    >
        Waiting for other players to connect...
        <ol class="players">{state.room.players.map(p => <li>{p.name}</li>)}</ol>
    </MsgScreen>
);
