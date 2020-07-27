import { h } from "hyperapp";

export const Screen = (
    { header, footer }: { header: string; footer: any },
    children,
) => (
    <main>
        <header>
            <h1
                onclick={function(state: State) {
                    console.log(state);
                    return state;
                }}
            >
                {header}
            </h1>
        </header>
        <article>{children}</article>
        <footer>{footer}</footer>
    </main>
);
