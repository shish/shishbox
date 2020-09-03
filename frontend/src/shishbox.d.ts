declare module '*.png';
declare module 'hyperapp';

type FormInputEvent = {
    target: HTMLTextAreaElement;
};

type Player = {
    name: string,
}

type Room = {
    game: string,
    phase: string,
    players: Array<Player>,
}

type WdRoom = Room & {
    stacks: Array<Array<[string, string]>>,
}

type Message = {
    user: string,
    message: string,
}

type ChatRoom = Room & {
    messages: Array<Message>,
}

type State = {
    conn: {
        user: string,
        room: string,
        sess: string,
    }
    error: String,
    room: WdRoom | ChatRoom,
    tmp_text_input: string,
    tmp_draw_last: Array<number>,
    tmp_draw_mode: "brush" | "pen" | "eraser",
    ws_errors: number,
    loading: string,
}
