// src/__tests__/generators/arb-texto-idea.ts — Generates idea text with edge-case Unicode
import fc from "fast-check";

/**
 * Emoji-heavy strings (👨‍👩‍👧‍👦 = 7 code points).
 */
const arbEmojiHeavy: fc.Arbitrary<string> = fc.oneof(
  fc.constant("👨‍👩‍👧‍👦 Family app idea 🚀✨🎉"),
  fc.constant("🏳️‍🌈🏳️‍⚧️ Diversity platform 👨‍👩‍👧‍👦👨‍👨‍👦"),
  fc.constant("💻🔒🌐📱🎯🤖🧠"),
  fc.array(fc.constantFrom("👨‍👩‍👧‍👦", "🚀", "✨", "🎉", "💻", "🔒", "🌐", "📱"), { minLength: 1, maxLength: 20 })
    .map((emojis) => emojis.join(" ")),
);

/**
 * Accented characters.
 */
const arbAccented: fc.Arbitrary<string> = fc.oneof(
  fc.constant("Aplicación de gestión de préstamos hipotecarios"),
  fc.constant("Résumé génération système intégré"),
  fc.constant("Ñandú côté café naïve über straße"),
  fc.stringOf(fc.constantFrom("á", "é", "í", "ó", "ú", "ñ", "ü", "ö", "ä", "ß", "ç", "ê", "â"), { minLength: 5, maxLength: 50 }),
);

/**
 * Combining characters (e.g., e + combining acute = é).
 */
const arbCombining: fc.Arbitrary<string> = fc.oneof(
  // e + combining acute accent (U+0301)
  fc.constant("e\u0301 idea with combining characters"),
  // a + combining tilde (U+0303) + combining dot below (U+0323)
  fc.constant("a\u0303\u0323 multi-combining"),
  // Zalgo-like text
  fc.string({ minLength: 3, maxLength: 10 }).map((base) =>
    base
      .split("")
      .map((ch) => ch + "\u0300\u0301\u0302")
      .join(""),
  ),
);

/**
 * Strings of only spaces.
 */
const arbOnlySpaces: fc.Arbitrary<string> = fc.oneof(
  fc.constant("   "),
  fc.constant("      "),
  fc.constant(" \t \n \r "),
  fc.nat({ max: 50 }).map((n) => " ".repeat(n + 1)),
);

/**
 * Strings at the boundary (19, 20, 2000, 2001 chars).
 */
const arbBoundary: fc.Arbitrary<string> = fc.oneof(
  // 19 chars (below minimum of 20)
  fc.stringOf(fc.constantFrom("a", "b", "c", "d", "e"), { minLength: 19, maxLength: 19 }),
  // 20 chars (at minimum)
  fc.stringOf(fc.constantFrom("a", "b", "c", "d", "e"), { minLength: 20, maxLength: 20 }),
  // 2000 chars (at maximum)
  fc.stringOf(fc.constantFrom("a", "b", "c", "d", "e"), { minLength: 2000, maxLength: 2000 }),
  // 2001 chars (above maximum)
  fc.stringOf(fc.constantFrom("a", "b", "c", "d", "e"), { minLength: 2001, maxLength: 2001 }),
);

/**
 * Combined arbitrary for all idea text edge cases.
 */
export const arbTextoIdea: fc.Arbitrary<string> = fc.oneof(
  arbEmojiHeavy,
  arbAccented,
  arbCombining,
  arbOnlySpaces,
  arbBoundary,
  // Regular strings for baseline
  fc.string({ minLength: 20, maxLength: 200 }),
);

export { arbEmojiHeavy, arbAccented, arbCombining, arbOnlySpaces, arbBoundary };
