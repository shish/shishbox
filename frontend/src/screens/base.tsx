import { h } from "hyperapp";

function ToggleSound(state: State): State {
    let new_state = {
        ...state,
        settings: {
            ...state.settings,
            sound: !state.settings.sound
        }
    }
    localStorage.setItem("settings", JSON.stringify(new_state.settings));
    return new_state;
}

export const Screen = (
    { settings, header, right, footer }: { settings: Settings, right: any, header: string; footer: any },
    children,
) => (
    <main>
        <header>
            { settings.sound ? 
                <i class="fas fa-bell" onclick={ToggleSound} /> :
                <i class="fas fa-bell-slash" onclick={ToggleSound} />
            }
            <h1
                onclick={function(state: State) {
                    console.log(state);
                    return state;
                }}
            >
                {header}
            </h1>
            {right || <i class="fas fa-cogs-x" />}
        </header>
        <article>{children}</article>
        <footer>{footer}</footer>
    </main>
);

export const MsgScreen = (
    { settings, header, footer }: { settings: Settings, header: string; footer: any },
    children: Array<any>,
) => (
    <Screen settings={settings} header={header} right={null} footer={footer}>
        <div class={"inputBlock"}>
            <p>{...children}</p>
        </div>
    </Screen>
);

export const Sfx = ({state, src}: {state: State; src: string}) => (
     <audio autoplay={state.settings.sound} src={src} />
)

export function ProgressPie({value}: {value: number}) {
    let r = 10;
    let c = 2 * Math.PI * r;
    let p = c * value;

    return <svg style={{width: "4rem", height: "4rem"}} viewBox="0 0 64 64">
        <g transform="rotate(-90 32 32)">
            <circle cx="32" cy="32" r={r*2} stroke="black" stroke-width="2" fill="none" />
            <circle cx="32" cy="32" r={r} stroke="black" stroke-width={r*2} fill="none"
                stroke-dasharray={p+", "+c} />
        </g>
    </svg>;
}
