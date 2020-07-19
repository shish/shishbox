declare module '*.png';
declare module 'hyperapp';

type FormInputEvent = {
    target: HTMLTextAreaElement;
};

type Player = {
    name: string,
}

type Stack = {

}

type WdGameState = {
    stacks: Array<Array<string>>,
    tmp_text_input: "",
    tmp_draw_last: Array<number>,
}

type State = {
    user: {
        name: string,
        color: string,
    }
    room: {
        id: string,
        game: string,
        tick: number,
        players: Array<Player>,
    },
    wd: WdGameState,
    ws_errors: number,
    loading: boolean,
}
