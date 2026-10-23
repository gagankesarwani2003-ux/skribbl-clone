export interface WordEntry {
  word: string;
  category: 'animals' | 'food' | 'objects' | 'actions';
  difficulty?: 'easy' | 'medium' | 'hard';
}

export class WordService {
  private static defaultWords: WordEntry[] = [
    // Animals
    { word: 'cat', category: 'animals', difficulty: 'easy' },
    { word: 'dog', category: 'animals', difficulty: 'easy' },
    { word: 'lion', category: 'animals', difficulty: 'easy' },
    { word: 'tiger', category: 'animals', difficulty: 'easy' },
    { word: 'elephant', category: 'animals', difficulty: 'medium' },
    { word: 'giraffe', category: 'animals', difficulty: 'medium' },
    { word: 'penguin', category: 'animals', difficulty: 'easy' },
    { word: 'kangaroo', category: 'animals', difficulty: 'medium' },
    { word: 'dolphin', category: 'animals', difficulty: 'medium' },
    { word: 'shark', category: 'animals', difficulty: 'easy' },
    { word: 'crocodile', category: 'animals', difficulty: 'hard' },
    { word: 'monkey', category: 'animals', difficulty: 'easy' },
    { word: 'butterfly', category: 'animals', difficulty: 'medium' },
    { word: 'octopus', category: 'animals', difficulty: 'medium' },
    { word: 'chameleon', category: 'animals', difficulty: 'hard' },
    { word: 'panda', category: 'animals', difficulty: 'easy' },
    { word: 'zebra', category: 'animals', difficulty: 'easy' },
    { word: 'flamingo', category: 'animals', difficulty: 'medium' },
    { word: 'hedgehog', category: 'animals', difficulty: 'hard' },
    { word: 'squirrel', category: 'animals', difficulty: 'medium' },
    { word: 'peacock', category: 'animals', difficulty: 'medium' },
    { word: 'whale', category: 'animals', difficulty: 'easy' },
    { word: 'koala', category: 'animals', difficulty: 'easy' },
    { word: 'frog', category: 'animals', difficulty: 'easy' },
    { word: 'turtle', category: 'animals', difficulty: 'easy' },

    // Food
    { word: 'pizza', category: 'food', difficulty: 'easy' },
    { word: 'burger', category: 'food', difficulty: 'easy' },
    { word: 'sushi', category: 'food', difficulty: 'medium' },
    { word: 'taco', category: 'food', difficulty: 'easy' },
    { word: 'pancake', category: 'food', difficulty: 'easy' },
    { word: 'apple', category: 'food', difficulty: 'easy' },
    { word: 'banana', category: 'food', difficulty: 'easy' },
    { word: 'strawberry', category: 'food', difficulty: 'medium' },
    { word: 'croissant', category: 'food', difficulty: 'hard' },
    { word: 'ice cream', category: 'food', difficulty: 'easy' },
    { word: 'donut', category: 'food', difficulty: 'easy' },
    { word: 'spaghetti', category: 'food', difficulty: 'medium' },
    { word: 'sandwich', category: 'food', difficulty: 'easy' },
    { word: 'hot dog', category: 'food', difficulty: 'easy' },
    { word: 'popcorn', category: 'food', difficulty: 'easy' },
    { word: 'chocolate', category: 'food', difficulty: 'easy' },
    { word: 'cupcake', category: 'food', difficulty: 'easy' },
    { word: 'watermelon', category: 'food', difficulty: 'medium' },
    { word: 'pineapple', category: 'food', difficulty: 'medium' },
    { word: 'avocado', category: 'food', difficulty: 'medium' },
    { word: 'cookie', category: 'food', difficulty: 'easy' },
    { word: 'waffle', category: 'food', difficulty: 'easy' },
    { word: 'noodles', category: 'food', difficulty: 'easy' },

    // Objects
    { word: 'guitar', category: 'objects', difficulty: 'easy' },
    { word: 'telescope', category: 'objects', difficulty: 'medium' },
    { word: 'bicycle', category: 'objects', difficulty: 'easy' },
    { word: 'airplane', category: 'objects', difficulty: 'easy' },
    { word: 'umbrella', category: 'objects', difficulty: 'easy' },
    { word: 'keyboard', category: 'objects', difficulty: 'easy' },
    { word: 'clock', category: 'objects', difficulty: 'easy' },
    { word: 'scissors', category: 'objects', difficulty: 'easy' },
    { word: 'backpack', category: 'objects', difficulty: 'easy' },
    { word: 'camera', category: 'objects', difficulty: 'easy' },
    { word: 'lighthouse', category: 'objects', difficulty: 'medium' },
    { word: 'rocket', category: 'objects', difficulty: 'easy' },
    { word: 'submarine', category: 'objects', difficulty: 'medium' },
    { word: 'microscope', category: 'objects', difficulty: 'hard' },
    { word: 'sunglasses', category: 'objects', difficulty: 'easy' },
    { word: 'television', category: 'objects', difficulty: 'easy' },
    { word: 'flashlight', category: 'objects', difficulty: 'medium' },
    { word: 'headphones', category: 'objects', difficulty: 'medium' },
    { word: 'treasure chest', category: 'objects', difficulty: 'medium' },
    { word: 'campfire', category: 'objects', difficulty: 'easy' },
    { word: 'volcano', category: 'objects', difficulty: 'medium' },
    { word: 'castle', category: 'objects', difficulty: 'medium' },
    { word: 'parachute', category: 'objects', difficulty: 'hard' },
    { word: 'skateboard', category: 'objects', difficulty: 'medium' },
    { word: 'compass', category: 'objects', difficulty: 'medium' },

    // Actions
    { word: 'dancing', category: 'actions', difficulty: 'medium' },
    { word: 'swimming', category: 'actions', difficulty: 'easy' },
    { word: 'running', category: 'actions', difficulty: 'easy' },
    { word: 'sleeping', category: 'actions', difficulty: 'easy' },
    { word: 'fishing', category: 'actions', difficulty: 'medium' },
    { word: 'painting', category: 'actions', difficulty: 'medium' },
    { word: 'cooking', category: 'actions', difficulty: 'medium' },
    { word: 'reading', category: 'actions', difficulty: 'easy' },
    { word: 'singing', category: 'actions', difficulty: 'medium' },
    { word: 'climbing', category: 'actions', difficulty: 'medium' },
    { word: 'flying', category: 'actions', difficulty: 'medium' },
    { word: 'crying', category: 'actions', difficulty: 'easy' },
    { word: 'laughing', category: 'actions', difficulty: 'easy' },
    { word: 'juggling', category: 'actions', difficulty: 'hard' },
    { word: 'skating', category: 'actions', difficulty: 'medium' },
    { word: 'whispering', category: 'actions', difficulty: 'hard' }
  ];

  public static getWordOptions(
    category: string,
    customWords: string[],
    count: number = 3
  ): string[] {
    let pool: string[] = [];

    if (customWords && customWords.length > 0) {
      // Include valid custom words
      const cleaned = customWords
        .map(w => w.trim().toLowerCase())
        .filter(w => w.length > 1);
      if (category === 'custom') {
        pool = cleaned;
      } else {
        pool = [...pool, ...cleaned];
      }
    }

    if (pool.length < count) {
      let filtered = this.defaultWords;
      if (category !== 'all' && category !== 'custom') {
        filtered = this.defaultWords.filter(item => item.category === category);
      }
      pool = [...new Set([...pool, ...filtered.map(item => item.word)])];
    }

    // Shuffle and pick `count` words
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  public static generateMask(word: string, revealedIndices: Set<number>): string {
    const chars: string[] = [];
    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      if (ch === ' ') {
        chars.push('  '); // Double space for word separator
      } else if (ch === '-') {
        chars.push('-');
      } else if (revealedIndices.has(i)) {
        chars.push(ch.toUpperCase());
      } else {
        chars.push('_');
      }
    }
    return chars.join(' ');
  }

  public static isGuessClose(guess: string, word: string): boolean {
    const g = guess.trim().toLowerCase();
    const w = word.trim().toLowerCase();
    if (g === w) return false; // That's an exact match, not just close

    // If length difference is more than 2, can't be close
    if (Math.abs(g.length - w.length) > 2) return false;

    // Levenshtein distance check
    const dist = this.levenshteinDistance(g, w);
    return dist === 1 || (w.length >= 7 && dist === 2);
  }

  public static isCorrectGuess(guess: string, word: string): boolean {
    return guess.trim().toLowerCase() === word.trim().toLowerCase();
  }

  private static levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }
}
