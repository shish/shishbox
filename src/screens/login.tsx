import {h} from "hyperapp";
import {Screen} from "./base";

export const LoginAction = (state) => [
    {...state, game: {id: "1234"}},
];

export const Login = ({state}: { state: State }) => (
    <Screen title={"Writey Drawey"}>
        <label>
            Room Code:
            <input placeholder="Enter 4-Letter Code" />
        </label>
        <label>
            Name:
            <input placeholder="Enter Your Name" />
        </label>
        <input type="button" value="Play" onclick={LoginAction} />
        <h2>
            Created by Shish
        </h2>
        <p>Email: <a href={"mailto:s@shish.io"}>s@shish.io</a></p>
        <p>Source Code: <a href={"https://github.com/shish/writey-drawey"}>GitHub</a></p>
        <p className={"donate"}>
            If you like this app and find it useful,
            <br/>feel free to donate
            via <a href={"https://paypal.me/shish2k"}>PayPal</a>
        </p>
    </Screen>
);