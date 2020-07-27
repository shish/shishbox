import { h } from "hyperapp";
import { WebSocketSend } from "hyperapp-fx";
import { Screen } from "./base";
import { socket_name } from "../shishbox";

const StartAction = (state: State) => [
    { ...state, room: { ...state.room, lobby: false } } as State,
    WebSocketSend({
        url: socket_name(state),
        data: JSON.stringify({
            cmd: "start",
        }),
    }),
];

export const Lobby = ({ state }: { state: State }) => (
    <Screen
        header={"Writey Drawey"}
        footer={
            <input type="button" value="Start Game" onclick={StartAction} />
        }
    >
        <div class={"inputBlock"}>
            <p>Waiting for other players to connect...</p>
            {state.room.players.map((p, n) => (
                <p>
                    {n + 1} - {p.name}
                </p>
            ))}
        </div>
    </Screen>
);
