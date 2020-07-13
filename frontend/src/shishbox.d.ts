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
    room: {
        id: string,
        tick: number,
        players: Array<Player>,
    },
    wd: {
        stacks: Array<Array<string>>,
        tmp_text_input: "",
        tmp_draw_last: Array<number>,    
    },
}
