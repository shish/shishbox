import {h} from "hyperapp";
import {Screen} from "./base";

export const StartAction = (state) => [
    {...state, room: {...state.room, tick: 0}},
];

export const Lobby = ({state}: { state: State }) => (
    <Screen header={"Writey Drawey"} footer={<input type="button" value="Start Game" onclick={StartAction} />}>
        <div class={"inputBlock"}>
            <p>Waiting for other players to connect...</p>
            <p>(TODO: implement multiple players. Right now this only
                works in a "pass your phone around a table" setting)</p>
            {state.room.players.map((p, n) => <p>{n+1} - {p.name}</p>)}
        </div>
    </Screen>
);