import { createSentence } from "sentence-engine";


/* ====================================================================
= Example sentences
==================================================================== */

function shuffleArray<T>(array: Array<T>): Array<T> {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

const templates = [
    // "{race} {job}",
    // "{animal} {role}",
    "{people} {event}",
    "{a-people} dancing with {a-people}",
    "romance between {a-people} and {a-people}",
    "the best {food}",
    "{a-job} riding {a-animal}",
    "{a-people} driving {a-car}",
    "{a-people} eating {a-food}",
    "race between {a-race} and {a-job}",
    "{a-job} and {a-job} having a cooking battle",
    "the world's most beautiful {job}",
    "{a-weather} over {a-building}",
    "{a-people} casting a magic spell",
    "{a-people} on a date with {a-people}",
];

let vocabulary = {
    race: ["robot", "elf", "alien", "skeleton", "dragon", "ghost", "mermaid", "brain"],
    job: [
        "chef",
        "wizard",
        "ninja",
        "pirate",
        "fairy",
        "clown",
        "hacker",
        "superhero",
        "angel",
        "demon",
        "astronaut",
    ],
    animal: [
        "frog",
        "sheep",
        "cat",
        "monkey",
        "worm",
        "unicorn",
        "bird",
        "turtle",
        "bat",
        "octopus",
        "squirrel",
        "snail",
        "centipede",
    ],
    role: ["king", "queen", "prince", "princess"],
    food: [
        "cake",
        "pie",
        "banana",
        "carrot",
        "pumpkin",
        "pear",
        "cheese",
        "flower",
    ],
    event: ["birthday party", "job interview"],
    building: ["hotel", "house", "bank", "hospital", "spaceship", "mountain"],
    weather: ["cloud", "rainbow"],
    car: ["car", "truck", "bus", "golf cart", "monster truck", "bicycle", "hamster ball"],
};
vocabulary["people"] = vocabulary["race"].concat(vocabulary["animal"]);

export const suggestions = shuffleArray(
    templates.map(t => createSentence(t, vocabulary).get()),
).splice(0, 5);

export const username = createSentence("{race} {job}", vocabulary).get();
