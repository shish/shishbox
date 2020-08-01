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

export const Lobby = ({ state }: { state: State }) => (
    <MsgScreen
        header={"Writey Drawey"}
        footer={
            <input type="button" value="Start Game" onclick={StartAction} />
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
