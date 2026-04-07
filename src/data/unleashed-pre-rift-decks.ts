/**
 * Decks mini pré-construídos do evento Pre-Rift (Unleashed).
 * @see https://riftmana.com/unleashed-pre-rift-event-rules-6-mini-pre-constructed-decks/
 */

export interface PreRiftDeck {
  slug: string;
  title: string;
  legend: string;
  /**
   * Opcional: número no catálogo (ex. UNL-195/219). Evita pegar reprint/outro set
   * quando o nome da Legend colide com outra carta.
   */
  legendCollector?: string;
  champion: string;
  battlefield: string;
  mainDeck: readonly string[];
}

export const UNLEASHED_PRE_RIFT_PROMO = {
  name: "Ashe, Focused",
  collectorNumber: "UNL-169/219",
} as const;

export const UNLEASHED_PRE_RIFT_DECKS: readonly PreRiftDeck[] = [
  {
    slug: "ivern",
    title: "Ivern",
    legend: "Ivern, Green Father",
    legendCollector: "UNL-195/219",
    champion: "Ivern, Nurturer",
    battlefield: "Trapping Grounds",
    mainDeck: [
      "Friendship",
      "Double Trouble",
      "Mutated Mouser",
      "Soul Harvest",
      "Crimson Pigeons",
      "Heroic Charge",
      "Loyal Poro",
      "Flurry of Feathers",
      "Frisky Hunter",
      "Stalking Wolf",
      "Starhound",
      "Ultrasoft Poro",
    ],
  },
  {
    slug: "jhin",
    title: "Jhin",
    legend: "Jhin, Virtuoso",
    champion: "Jhin, Murderous Artist",
    battlefield: "Forgotten Library",
    mainDeck: [
      "Downstage Dramatics",
      "Frigid Jewel",
      "Icevale Archer",
      "Lotus Trap",
      "Upstage Comedy",
      "Prepared Neophyte",
      "Deadly Flourish",
      "Dramatic Visionary",
      "Square Up",
      "Fate Weaver",
      "Sprite Burst",
      "Revna the Lorekeeper",
    ],
  },
  {
    slug: "khazix",
    title: "Kha'Zix",
    legend: "Kha'Zix, Voidreaver",
    champion: "Kha'Zix, Mutating Horror",
    battlefield: "Ripper's Bay",
    mainDeck: [
      "Scryer's Bloom",
      "Demacian Diplomat",
      "Grim Resolve",
      "Isolate",
      "Mister Root",
      "Call to Battle",
      "Crowd Favorite",
      "Hunter's Machete",
      "Insightful Investigator",
      "Kinkou Initiate",
      "Vicious Snapjaws",
      "Megatusk",
    ],
  },
  {
    slug: "diana",
    title: "Diana",
    legend: "Diana, Scorn of the Moon",
    champion: "Diana, Lunari",
    battlefield: "Abandoned Hall",
    mainDeck: [
      "Existential Dread",
      "Abandon",
      "Icevale Archer",
      "Bewitching Spirit",
      "Chakram Dancer",
      "Crescent Strike",
      "Eclipse",
      "Gustwalker",
      "Lunar Boon",
      "Crescent Guardian",
      "Walking Roost",
      "Moonlight Affliction",
    ],
  },
  {
    slug: "vi",
    title: "Vi",
    legend: "Vi, Piltover Enforcer",
    champion: "Vi, Peacekeeper",
    battlefield: "Valley of Idols",
    mainDeck: [
      "Carrion Dredger",
      "Inferna",
      "Smite",
      "Black Rose Dignitary",
      "Heroic Charge",
      "Sharkling",
      "Mageseeker Investigator",
      "Square Up",
      "Arena Kingpin",
      "Lord Broadmane",
      "Ultrasoft Poro",
      "Yeti Brawler",
    ],
  },
  {
    slug: "master-yi",
    title: "Master Yi",
    legend: "Master Yi, Wuju Master",
    champion: "Master Yi, Tempered",
    battlefield: "Gardens of Becoming",
    mainDeck: [
      "Combat Experience",
      "Soul Sword",
      "Gemhand Hunter",
      "Skyward Strike",
      "Stare Down",
      "Wuju Apprentice",
      "Enthusiastic Promoter",
      "Mosstomper",
      "Herald of Spring",
      "Wily Newtfish",
      "Concentrate",
      "Voracious Gromp",
    ],
  },
] as const;
