export const COLOUR_COUNT = 120;
export const DETAIL_EDGE = 156;
export const STORAGE_PREFIX = "painted-masterpiece-v2-";

export const PAINTINGS = {
  "starry-night": {
    title: "The Starry Night",
    artist: "Vincent van Gogh",
    year: "1889",
    difficulty: "Intricate",
    orientation: "landscape",
    alt: "The Starry Night by Vincent van Gogh",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/960px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
    source: "https://commons.wikimedia.org/wiki/File:Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
  },
  "great-wave": {
    title: "The Great Wave",
    artist: "After Katsushika Hokusai",
    year: "c. 1830",
    difficulty: "Detailed",
    orientation: "landscape",
    alt: "The Great Wave off Kanagawa after Katsushika Hokusai",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/The_Great_Wave_off_Kanagawa.jpg/960px-The_Great_Wave_off_Kanagawa.jpg",
    source: "https://commons.wikimedia.org/wiki/File:The_Great_Wave_off_Kanagawa.jpg",
  },
  "pearl-earring": {
    title: "Girl with a Pearl Earring",
    artist: "Johannes Vermeer",
    year: "c. 1665",
    difficulty: "Layered",
    orientation: "portrait",
    alt: "Girl with a Pearl Earring by Johannes Vermeer",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Girl_with_a_Pearl_Earring.jpg/960px-Girl_with_a_Pearl_Earring.jpg",
    source: "https://commons.wikimedia.org/wiki/File:Girl_with_a_Pearl_Earring.jpg",
  },
  "mona-lisa": {
    title: "Mona Lisa",
    artist: "Leonardo da Vinci",
    year: "c. 1503–1506",
    difficulty: "Subtle",
    orientation: "portrait",
    alt: "Mona Lisa by Leonardo da Vinci",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/960px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg",
    source: "https://commons.wikimedia.org/wiki/File:Mona_Lisa,_by_Leonardo_da_Vinci,_from_C2RMF_retouched.jpg",
  },
};

export function progressKey(id) {
  return `${STORAGE_PREFIX}${id}`;
}
