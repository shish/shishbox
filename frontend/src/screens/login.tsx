import {h} from "hyperapp";
import {Screen} from "./base";

function LoginAction(state) {
    let name = (document.getElementById("name") as HTMLFormElement).value;
    let room = (document.getElementById("room") as HTMLFormElement).value;

    return {
        ...state,
        user: {
            ...state.user,
            name: name,
        },
        room: {
            ...state.room,
            id: room,
            game: "wd",
            tick: -1,
            players: [
                {name: name},
            ]
        }
    };
}

const About = () => (
    <div>
        <h2>
            <a href={"https://github.com/shish/shishbox"}>ShishBox</a>
            &nbsp;by&nbsp;
            <a href={"mailto:s@shish.io"}>Shish</a>
        </h2>
        <p className={"donate"}>
            If you like this app and find it fun,
            <br/>feel free to donate
            via <a href={"https://paypal.me/shish2k"}>PayPal</a>
        </p>
    </div>
);

export const Login = ({state}: { state: State }) => (
    <Screen header={"Join a Game"} footer={<About/>}>
        <input type="text" id="room" placeholder="Enter Room Code" value="12345" />
        <input type="text" id="name" placeholder="Enter Your Name" value="Shish" />
        <input type="button" value="Play" onclick={LoginAction} />
    </Screen>
);