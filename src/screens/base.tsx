import {h} from "hyperapp";

export const Screen = (
    {title}: {title: string},
    children
) => (
    <main>
        <header>
            <h1 onclick={function(state) {console.log(state); return state;}}>{title}</h1>
        </header>
        <article>
            {children}
        </article>
        <footer>
            &copy; Shish 2020 - <a href="https://github.com/shish/shishbox">Source</a>
        </footer>
    </main>
);
