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
        header={"Writey Drawey"}
        footer={
            state.room.players[0].name == state.conn.user ?
                <input type="button" value="Start Game" onclick={StartAction} /> :
                <input type="button" value="Leave" onclick={LeaveAction} />
        }
    >
        <p>Waiting for other players to connect...</p>
        {state.room.players.map((p, n) => (
            <p>
                {n + 1} - {p.name}
            </p>
        ))}
    </MsgScreen>
);
