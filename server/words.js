/**
 * Words database for the drawing and guessing game.
 * Contains easy, medium, and hard words across varied themes (animals, objects, foods, nature, actions).
 */
const WORDS = [
  // Easy / Familiar
  "apple", "banana", "cat", "dog", "sun", "moon", "star", "tree", "house", "car",
  "boat", "fish", "bird", "hat", "book", "shoe", "ball", "door", "cup", "clock",
  "pizza", "cake", "ice cream", "cookie", "flower", "cloud", "rain", "heart", "smile", "eye",
  "hand", "key", "chair", "table", "bed", "spoon", "fork", "lamp", "sock", "ring",
  "kite", "egg", "pencil", "bell", "duck", "frog", "bear", "lion", "snake", "mouse",

  // Medium
  "airplane", "bicycle", "camera", "guitar", "piano", "castle", "bridge", "mountain", "volcano", "island",
  "beach", "rocket", "robot", "alien", "pirate", "ninja", "wizard", "crown", "sword", "shield",
  "rainbow", "lightning", "tornado", "campfire", "tent", "backpack", "compass", "anchor", "lighthouse", "telescope",
  "microscope", "computer", "keyboard", "headphones", "television", "sandwich", "burger", "popcorn", "sushi", "donut",
  "penguin", "elephant", "giraffe", "monkey", "dolphin", "whale", "octopus", "spider", "butterfly", "turtle",

  // Advanced / Fun Concepts
  "astronaut", "submarine", "helicopter", "roller coaster", "ferris wheel", "dinosaur", "dragon", "treasure chest", "magic wand", "time machine",
  "black hole", "solar system", "constellation", "waterfall", "desert", "pyramid", "statue of liberty", "eiffel tower", "traffic light", "fire extinguisher",
  "skateboard", "parachute", "hot air balloon", "snowboard", "origami", "boomerang", "stethoscope", "hourglass", "chandelier", "microchip"
];

function getRandomWords(count = 3, exclude = []) {
  const available = WORDS.filter(w => !exclude.includes(w));
  const selected = [];
  const pool = [...available];

  while (selected.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(idx, 1)[0]);
  }
  return selected;
}

module.exports = {
  WORDS,
  getRandomWords
};
