// Password Generator Service - Generate secure passwords and passphrases

export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeSimilar: boolean;
}

export interface PassphraseOptions {
  wordCount: number;
  separator: string;
  capitalize: boolean;
  includeNumber: boolean;
}

export interface GeneratedPassword {
  id: string;
  value: string;
  strength: PasswordStrength;
  type: "password" | "passphrase";
  timestamp: Date;
  options: PasswordOptions | PassphraseOptions;
}

export type PasswordStrength =
  | "weak"
  | "fair"
  | "good"
  | "strong"
  | "excellent";

// Character sets
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+-=[]{}|;:,.<>?";

// Similar characters to exclude
const SIMILAR_CHARS = "0O1lI|";

// Common word list for passphrases (EFF short wordlist subset)
const WORDLIST = [
  "acid",
  "aged",
  "also",
  "area",
  "army",
  "away",
  "baby",
  "back",
  "ball",
  "band",
  "bank",
  "base",
  "bath",
  "bear",
  "beat",
  "been",
  "beer",
  "bell",
  "belt",
  "bend",
  "best",
  "bill",
  "bird",
  "bite",
  "blow",
  "blue",
  "boat",
  "body",
  "bomb",
  "bond",
  "bone",
  "book",
  "boom",
  "born",
  "boss",
  "both",
  "bowl",
  "burn",
  "busy",
  "cake",
  "call",
  "calm",
  "came",
  "camp",
  "cape",
  "card",
  "care",
  "cart",
  "case",
  "cash",
  "cast",
  "cave",
  "chat",
  "chip",
  "city",
  "clay",
  "club",
  "coal",
  "coat",
  "code",
  "cold",
  "come",
  "cook",
  "cool",
  "cope",
  "copy",
  "core",
  "corn",
  "cost",
  "crew",
  "crop",
  "dark",
  "data",
  "date",
  "dawn",
  "deal",
  "dear",
  "debt",
  "deep",
  "desk",
  "dial",
  "diet",
  "dirt",
  "disc",
  "dish",
  "dock",
  "door",
  "dose",
  "down",
  "draw",
  "drew",
  "drip",
  "drop",
  "drug",
  "drum",
  "dual",
  "duck",
  "duke",
  "dust",
  "duty",
  "each",
  "earn",
  "ease",
  "east",
  "easy",
  "echo",
  "edge",
  "else",
  "even",
  "ever",
  "evil",
  "exam",
  "exit",
  "face",
  "fact",
  "fail",
  "fair",
  "fall",
  "fame",
  "farm",
  "fast",
  "fate",
  "fear",
  "feed",
  "feel",
  "feet",
  "fell",
  "felt",
  "file",
  "fill",
  "film",
  "find",
  "fine",
  "fire",
  "firm",
  "fish",
  "five",
  "flat",
  "flew",
  "flow",
  "folk",
  "food",
  "foot",
  "ford",
  "form",
  "fort",
  "four",
  "free",
  "from",
  "fuel",
  "full",
  "fund",
  "gain",
  "game",
  "gang",
  "gate",
  "gave",
  "gear",
  "gene",
  "gift",
  "girl",
  "give",
  "glad",
  "glow",
  "goal",
  "goes",
  "gold",
  "golf",
  "gone",
  "good",
  "grab",
  "gray",
  "grew",
  "grey",
  "grid",
  "grin",
  "grip",
  "grow",
  "gulf",
  "hack",
  "hair",
  "half",
  "hall",
  "hand",
  "hang",
  "hard",
  "harm",
  "hate",
  "have",
  "head",
  "heal",
  "hear",
  "heat",
  "held",
  "help",
  "here",
  "hero",
  "hide",
  "high",
  "hill",
  "hire",
  "hold",
  "hole",
  "home",
  "hook",
  "hope",
  "horn",
  "host",
  "hour",
  "huge",
  "hung",
  "hunt",
  "icon",
  "idea",
  "inch",
  "info",
  "iron",
  "item",
  "jack",
  "jail",
  "jazz",
  "jean",
  "join",
  "joke",
  "jump",
  "jury",
  "just",
  "keen",
  "keep",
  "kick",
  "kill",
  "kind",
  "king",
  "knee",
  "knew",
  "know",
  "lack",
  "lady",
  "laid",
  "lake",
  "lamp",
  "land",
  "lane",
  "last",
  "late",
  "lawn",
  "lead",
  "left",
  "lend",
  "lens",
  "less",
  "life",
  "lift",
  "like",
  "lime",
  "line",
  "link",
  "list",
  "live",
  "load",
  "loan",
  "lock",
  "logo",
  "long",
  "look",
  "lord",
  "lose",
  "loss",
  "lost",
  "love",
  "luck",
  "lung",
  "made",
  "mail",
  "main",
  "make",
  "male",
  "many",
  "mark",
  "mask",
  "mass",
  "mate",
  "meal",
  "mean",
  "meat",
  "meet",
  "menu",
  "mere",
  "mild",
  "milk",
  "mill",
  "mind",
  "mine",
  "miss",
  "mode",
  "mood",
  "moon",
  "more",
  "most",
  "move",
  "much",
  "must",
  "myth",
  "nail",
  "name",
  "navy",
  "near",
  "neat",
  "neck",
  "need",
  "nest",
  "news",
  "next",
  "nice",
  "nine",
  "node",
  "none",
  "noon",
  "norm",
  "nose",
  "note",
  "noun",
  "okay",
  "once",
  "only",
  "onto",
  "open",
  "oral",
  "oven",
  "over",
  "pace",
  "pack",
  "page",
  "paid",
  "pain",
  "pair",
  "palm",
  "park",
  "part",
  "pass",
  "past",
  "path",
  "peak",
  "pick",
  "pile",
  "pine",
  "pink",
  "pipe",
  "plan",
  "play",
  "plot",
  "plug",
  "plus",
  "poem",
  "poet",
  "pole",
  "poll",
  "pond",
  "pool",
  "poor",
  "port",
  "pose",
  "post",
  "pour",
  "pray",
  "pull",
  "pump",
  "pure",
  "push",
  "quit",
  "race",
  "rail",
  "rain",
  "rank",
  "rare",
  "rate",
  "read",
  "real",
  "rear",
  "rely",
  "rent",
  "rest",
  "rice",
  "rich",
  "ride",
  "ring",
  "rise",
  "risk",
  "road",
  "rock",
  "role",
  "roll",
  "roof",
  "room",
  "root",
  "rope",
  "rose",
  "rule",
  "rush",
  "safe",
  "said",
  "sail",
  "sake",
  "sale",
  "salt",
  "same",
  "sand",
  "sang",
  "save",
  "seal",
  "seat",
  "seed",
  "seek",
  "seem",
  "self",
  "sell",
  "send",
  "sent",
  "ship",
  "shop",
  "shot",
  "show",
  "shut",
  "sick",
  "side",
  "sign",
  "silk",
  "sink",
  "site",
  "size",
  "skin",
  "slip",
  "slow",
  "snap",
  "snow",
  "soft",
  "soil",
  "sold",
  "sole",
  "some",
  "song",
  "soon",
  "sort",
  "soul",
  "spin",
  "spot",
  "star",
  "stay",
  "stem",
  "step",
  "stop",
  "suit",
  "sure",
  "swim",
  "tail",
  "take",
  "tale",
  "talk",
  "tall",
  "tank",
  "tape",
  "task",
  "team",
  "tear",
  "tech",
  "tell",
  "tend",
  "term",
  "test",
  "text",
  "than",
  "that",
  "them",
  "then",
  "they",
  "thin",
  "this",
  "thus",
  "tide",
  "tier",
  "till",
  "time",
  "tiny",
  "tone",
  "took",
  "tool",
  "tour",
  "town",
  "trap",
  "tree",
  "trim",
  "trip",
  "true",
  "tube",
  "tune",
  "turn",
  "twin",
  "type",
  "unit",
  "upon",
  "used",
  "user",
  "vary",
  "vast",
  "very",
  "vice",
  "view",
  "vote",
  "wage",
  "wait",
  "wake",
  "walk",
  "wall",
  "want",
  "warm",
  "warn",
  "wash",
  "wave",
  "weak",
  "wear",
  "week",
  "well",
  "went",
  "west",
  "what",
  "when",
  "wide",
  "wife",
  "wild",
  "will",
  "wind",
  "wine",
  "wing",
  "wire",
  "wise",
  "wish",
  "with",
  "woke",
  "wood",
  "word",
  "wore",
  "work",
  "wrap",
  "yard",
  "yeah",
  "year",
  "yoga",
  "your",
  "zero",
  "zone",
];

// Generate unique ID
function generateId(): string {
  return `pwd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get secure random number
function secureRandom(): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0]! / (0xffffffff + 1);
}

// Get random integer in range [0, max)
function randomInt(max: number): number {
  return Math.floor(secureRandom() * max);
}

// Shuffle array using Fisher-Yates
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/**
 * Generate a random password
 */
export function generatePassword(options: PasswordOptions): string {
  let charset = "";
  const requiredChars: string[] = [];

  // Build character set and ensure at least one from each selected type
  if (options.uppercase) {
    let chars = UPPERCASE;
    if (options.excludeSimilar) {
      chars = chars
        .split("")
        .filter((c) => !SIMILAR_CHARS.includes(c))
        .join("");
    }
    charset += chars;
    requiredChars.push(chars[randomInt(chars.length)]!);
  }

  if (options.lowercase) {
    let chars = LOWERCASE;
    if (options.excludeSimilar) {
      chars = chars
        .split("")
        .filter((c) => !SIMILAR_CHARS.includes(c))
        .join("");
    }
    charset += chars;
    requiredChars.push(chars[randomInt(chars.length)]!);
  }

  if (options.numbers) {
    let chars = NUMBERS;
    if (options.excludeSimilar) {
      chars = chars
        .split("")
        .filter((c) => !SIMILAR_CHARS.includes(c))
        .join("");
    }
    charset += chars;
    requiredChars.push(chars[randomInt(chars.length)]!);
  }

  if (options.symbols) {
    let chars = SYMBOLS;
    if (options.excludeSimilar) {
      chars = chars
        .split("")
        .filter((c) => !SIMILAR_CHARS.includes(c))
        .join("");
    }
    charset += chars;
    requiredChars.push(chars[randomInt(chars.length)]!);
  }

  if (charset.length === 0) {
    throw new Error("At least one character type must be selected");
  }

  // Generate remaining characters
  const remaining = options.length - requiredChars.length;
  const additionalChars: string[] = [];

  for (let i = 0; i < remaining; i++) {
    additionalChars.push(charset[randomInt(charset.length)]!);
  }

  // Combine and shuffle
  const allChars = [...requiredChars, ...additionalChars];
  return shuffle(allChars).join("");
}

/**
 * Generate a passphrase
 */
export function generatePassphrase(options: PassphraseOptions): string {
  const words: string[] = [];

  for (let i = 0; i < options.wordCount; i++) {
    let word = WORDLIST[randomInt(WORDLIST.length)]!;
    if (options.capitalize) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
    }
    words.push(word);
  }

  let passphrase = words.join(options.separator);

  if (options.includeNumber) {
    const num = randomInt(100);
    passphrase += options.separator + num.toString();
  }

  return passphrase;
}

/**
 * Calculate password strength
 */
export function calculateStrength(password: string): PasswordStrength {
  let score = 0;
  const length = password.length;

  // Length scoring
  if (length >= 8) score += 1;
  if (length >= 12) score += 1;
  if (length >= 16) score += 1;
  if (length >= 20) score += 1;
  if (length >= 24) score += 1;

  // Character variety scoring
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSymbols = /[^A-Za-z0-9]/.test(password);

  if (hasUppercase) score += 1;
  if (hasLowercase) score += 1;
  if (hasNumbers) score += 1;
  if (hasSymbols) score += 2; // Symbols get extra weight

  // Variety bonus
  const charTypes = [hasUppercase, hasLowercase, hasNumbers, hasSymbols].filter(
    Boolean,
  ).length;
  if (charTypes >= 3) score += 1;
  if (charTypes === 4) score += 1;

  // Entropy estimation bonus
  let charsetSize = 0;
  if (hasUppercase) charsetSize += 26;
  if (hasLowercase) charsetSize += 26;
  if (hasNumbers) charsetSize += 10;
  if (hasSymbols) charsetSize += 32;

  const entropy = Math.log2(Math.pow(charsetSize, length));
  if (entropy >= 60) score += 1;
  if (entropy >= 80) score += 1;
  if (entropy >= 100) score += 1;

  // Map score to strength
  if (score <= 4) return "weak";
  if (score <= 7) return "fair";
  if (score <= 10) return "good";
  if (score <= 13) return "strong";
  return "excellent";
}

/**
 * Get strength color
 */
export function getStrengthColor(strength: PasswordStrength): string {
  switch (strength) {
    case "weak":
      return "red";
    case "fair":
      return "yellow";
    case "good":
      return "blue";
    case "strong":
      return "green";
    case "excellent":
      return "cyan";
  }
}

/**
 * Get strength meter bar
 */
export function getStrengthBar(
  strength: PasswordStrength,
  width: number = 20,
): string {
  const levels: Record<PasswordStrength, number> = {
    weak: 1,
    fair: 2,
    good: 3,
    strong: 4,
    excellent: 5,
  };

  const level = levels[strength];
  const filled = Math.floor((level / 5) * width);
  const empty = width - filled;

  return "[" + "=".repeat(filled) + " ".repeat(empty) + "]";
}

/**
 * Format bits of entropy
 */
export function calculateEntropy(password: string): number {
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSymbols = /[^A-Za-z0-9]/.test(password);

  let charsetSize = 0;
  if (hasUppercase) charsetSize += 26;
  if (hasLowercase) charsetSize += 26;
  if (hasNumbers) charsetSize += 10;
  if (hasSymbols) charsetSize += 32;

  if (charsetSize === 0) return 0;

  return Math.round(Math.log2(Math.pow(charsetSize, password.length)));
}

/**
 * Password history manager
 */
export class PasswordHistory {
  private passwords: GeneratedPassword[] = [];
  private maxSize: number;

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
  }

  add(
    value: string,
    type: "password" | "passphrase",
    options: PasswordOptions | PassphraseOptions,
  ): GeneratedPassword {
    const entry: GeneratedPassword = {
      id: generateId(),
      value,
      strength: calculateStrength(value),
      type,
      timestamp: new Date(),
      options,
    };

    this.passwords.unshift(entry);

    // Trim to max size
    if (this.passwords.length > this.maxSize) {
      this.passwords = this.passwords.slice(0, this.maxSize);
    }

    return entry;
  }

  getAll(): GeneratedPassword[] {
    return [...this.passwords];
  }

  clear(): void {
    this.passwords = [];
  }

  getRecent(count: number = 10): GeneratedPassword[] {
    return this.passwords.slice(0, count);
  }

  getLast(): GeneratedPassword | null {
    return this.passwords[0] || null;
  }

  remove(id: string): void {
    this.passwords = this.passwords.filter((p) => p.id !== id);
  }
}

/**
 * Default password options
 */
export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeSimilar: false,
};

/**
 * Default passphrase options
 */
export const DEFAULT_PASSPHRASE_OPTIONS: PassphraseOptions = {
  wordCount: 4,
  separator: "-",
  capitalize: true,
  includeNumber: true,
};

/**
 * Copy text to clipboard (using pbcopy on macOS)
 */
export async function copyToClipboard(text: string): Promise<void> {
  const { spawn } = await import("child_process");

  return new Promise((resolve, reject) => {
    const proc = spawn("pbcopy");
    proc.stdin.write(text);
    proc.stdin.end();

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`pbcopy exited with code ${code}`));
      }
    });

    proc.on("error", reject);
  });
}
