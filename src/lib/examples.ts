import { choicesFrom, PRESETS, type Choice } from "@/lib/wisp";

/** Sample inputs for the random button. All public examples stay in English. */
export type Example = {
  presetId: string | null;
  text: string;
  choices?: Omit<Choice, "id">[];
};

const ALLOW_BLOCK = [{ question: "Allow this content?", options: ["ALLOW", "BLOCK"] }];
const ACTIONABLE = [{ question: "Moderator action required?", options: ["ACTIONABLE", "NOT_ACTIONABLE"] }];
const SEVERITY = [
  { question: "Human review required?", options: ["REVIEW", "NO_ACTION"] },
  { question: "Severity", options: ["LOW", "MEDIUM", "HIGH"] },
];

export const EXAMPLES: Example[] = [
  // Moderation: direct, contrastive, quoted, negated, ironic, and indirect harm.
  { presetId: "moderation", text: "I will find your address and make you pay." },
  { presetId: "moderation", text: "I will report this behavior to the moderators." },
  { presetId: "moderation", text: "You played badly, seriously." },
  { presetId: "moderation", text: "You played badly, and I will find where you live." },
  { presetId: "moderation", text: "He told me 'I will hurt you' in chat, what should I do?" },
  { presetId: "moderation", text: "I am not going to threaten you, calm down." },
  { presetId: "moderation", text: "Great, another genius threatening everyone." },
  { presetId: "moderation", text: "You will see what happens to you tonight." },
  { presetId: "moderation", text: "gg wp, good game everyone" },
  { presetId: "moderation", text: "I know where you live. 42 Elm Street, right?" },
  { presetId: "moderation", text: "nice try, better luck next round lol" },
  { presetId: "moderation", text: "That boss is deadly; I am going to kill it tonight." },
  { presetId: "moderation", text: "send nudes or I will share your photos", choices: SEVERITY },
  { presetId: "moderation", text: "you are terrible but I still like you", choices: ACTIONABLE },
  { presetId: "moderation", text: "Shut up, nobody wants you here.", choices: ACTIONABLE },
  { presetId: "moderation", text: "One more word and I will post your number on the server.", choices: SEVERITY },
  { presetId: "moderation", text: "This update is a disaster, are the developers asleep?", choices: ALLOW_BLOCK },
  { presetId: "moderation", text: "go hang yourself", choices: ALLOW_BLOCK },
  { presetId: "moderation_detailed", text: "I will find your address and make you pay." },
  { presetId: "moderation_detailed", text: "People like you should not be allowed in this country." },
  { presetId: "moderation_detailed", text: "They live at 12 Lilac Street, go pay them a visit." },
  { presetId: "moderation_detailed", text: "Every day I will ruin your matches until you quit." },
  { presetId: "moderation_detailed", text: "Send me a picture of yourself in underwear." },
  { presetId: "moderation_detailed", text: "Free gold, visit g0ld-farm.xyz now!!!" },

  // Report validity.
  { presetId: "report_validity", text: "They threatened me in chat: 'I will find you.'" },
  { presetId: "report_validity", text: "They beat me three times in a row; that is unfair." },
  { presetId: "report_validity", text: "Report: they posted a player's address in the public channel." },
  { presetId: "report_validity", text: "I am reporting them because they reported me first." },
  { presetId: "report_validity", text: "They are spamming phishing links in private messages." },
  { presetId: "report_validity", text: "I do not like their username." },

  // Usernames.
  { presetId: "username", text: "Admin_OfficiaI" },
  { presetId: "username", text: "xX_Dark_Knight_Xx" },
  { presetId: "username", text: "SupportTeam.Offical" },
  { presetId: "username", text: "alex.smith.0612345678" },
  { presetId: "username", text: "FreeV-Bucks_dot_com" },
  { presetId: "username", text: "LunaMoonlight" },
  { presetId: "username", text: "PixelPanda_42" },
  { presetId: "username", text: "CoffeeAndCode" },
  { presetId: "username", text: "Maya_the_Builder" },
  { presetId: "username", text: "I_Will_Kill_You_All" },
  { presetId: "username", text: "hot_nudes_dm_me", choices: ALLOW_BLOCK },
];

export function randomExample(currentText: string): Example {
  const pool = EXAMPLES.filter((example) => example.text !== currentText);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Composer fields for a random example: everything is a greyed-out, sendable suggestion. */
export function randomScenario(currentText = "") {
  const example = randomExample(currentText);
  const preset = PRESETS.find((p) => p.id === example.presetId);
  return {
    presetId: example.presetId,
    text: "",
    suggestedText: example.text,
    choices: choicesFrom(example.choices ?? preset?.choices ?? []),
  };
}
