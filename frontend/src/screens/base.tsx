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
    { settings, header, footer }: { settings: Settings, header: string; footer: any },
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
            <i class="fas fa-cogs-x" />
        </header>
        <article>{children}</article>
        <footer>{footer}</footer>
    </main>
);

export const MsgScreen = (
    { settings, header, footer }: { settings: Settings, header: string; footer: any },
    children,
) => (
    <Screen settings={settings} header={header} footer={footer}>
        <div class={"inputBlock"}>
            <p>{...children}</p>
        </div>
    </Screen>
);

export const Sfx = ({state, src}: {state: State; src: string}) => (
     <audio autoplay={state.settings.sound} src={src} />
)