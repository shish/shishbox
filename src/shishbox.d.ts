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

type State = {
    user: {
        name: string,
        color: string,
    }
    game: {
        id: string,
        tick: number,
        players: Array<Player>,
        stacks: Array<Array<string>>,
    },
    tmp_text_input: "",
    tmp_draw_input: Array<Array<number|boolean>>,
    tmp_draw_pressed: boolean,
}
