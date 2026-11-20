export interface BagProduct {
  id: string;
  name: string;
  shortName: string;
  price: number;
  priceFormatted: string;
  image: string;
  category: "recent" | "top" | "trending" | "foryou";
  specs: {
    style: string;
    size: string;
    carry: string;
    bestFor: string;
    color: string;
    summaryNote: string;
  };
}

export const BAG_CATALOG: BagProduct[] = [
  {
    id: "tabby-26",
    name: "Tabby Shoulder Bag 26",
    shortName: "Tabby 26",
    price: 475,
    priceFormatted: "$475",
    image: "/assets/figma/bag-tabby-26.png",
    category: "top",
    specs: {
      style: "Structured icon",
      size: "Medium",
      carry: "Shoulder + Crossbody",
      bestFor: "Day to evening",
      color: "Black / Brass",
      summaryNote:
        "The Tabby 26 pairs archival structured polish with two detachable straps that transition effortlessly from daytime tailoring to evening.",
    },
  },
  {
    id: "soft-tabby-20",
    name: "Soft Tabby Shoulder Bag 20",
    shortName: "Soft Tabby 20",
    price: 375,
    priceFormatted: "$375",
    image: "/assets/figma/bag-soft-tabby-20.png",
    category: "foryou",
    specs: {
      style: "Relaxed flap shoulder",
      size: "Small",
      carry: "Handle + Crossbody",
      bestFor: "Dinner / Weekends",
      color: "Maple / Brass",
      summaryNote:
        "The Soft Tabby 20 softens our iconic C hardware in supple smooth leather for a compact, easygoing silhouette.",
    },
  },
  {
    id: "juliet-25",
    name: "Juliet Shoulder Bag 25 With Quilting And Charms",
    shortName: "Juliet 25",
    price: 525,
    priceFormatted: "$525",
    image: "/assets/figma/bag-juliet-25.png",
    category: "recent",
    specs: {
      style: "Crescent hobo",
      size: "Small / Medium",
      carry: "Shoulder + Chain",
      bestFor: "Going out / Statement",
      color: "Black",
      summaryNote:
        "The Juliet 25 brings plush quilting and sculptural chain charms for an unmistakable statement silhouette.",
    },
  },
  {
    id: "ergo-26",
    name: "Belted Ergo Shoulder Bag 26 In Signature Jacquard",
    shortName: "Belted Ergo 26",
    price: 295,
    priceFormatted: "$295",
    image: "/assets/figma/bag-ergo-jacquard.png",
    category: "trending",
    specs: {
      style: "Curved hobo",
      size: "Small / Medium",
      carry: "Shoulder Only",
      bestFor: "Casual days",
      color: "Oak / Maple",
      summaryNote:
        "The Belted Ergo 26 nods to 90s Coach heritage in woven Signature jacquard with a sleek belted buckle.",
    },
  },
  {
    id: "chelsea-30",
    name: "Chelsea Shoulder Bag 30",
    shortName: "Chelsea 30",
    price: 325,
    priceFormatted: "$325",
    image: "/assets/figma/bag-chelsea-30.png",
    category: "trending",
    specs: {
      style: "Structured satchel",
      size: "Medium",
      carry: "Handle + Strap",
      bestFor: "Work / Events",
      color: "Dark Cherry",
      summaryNote:
        "The Chelsea 30 balances a relaxed East-West flap with rich dark cherry leather that transitions seamlessly from office to dinner.",
    },
  },
  {
    id: "brooklyn-28",
    name: "Brooklyn Shoulder Bag 28",
    shortName: "Brooklyn 28",
    price: 295,
    priceFormatted: "$295",
    image: "/assets/figma/bag-brooklyn-28.png",
    category: "recent",
    specs: {
      style: "Minimalist hobo",
      size: "Medium",
      carry: "Shoulder Only",
      bestFor: "Everyday carry",
      color: "Dark Ruby",
      summaryNote:
        "The Brooklyn 28 is an effortlessly draped natural grain leather hobo with generous room and clean lines.",
    },
  },
  {
    id: "tabby-chain-19",
    name: "Tabby Chain Crossbody 19",
    shortName: "Tabby Chain Crossbody 19",
    price: 295,
    priceFormatted: "$295",
    image: "/assets/figma/bag-soft-tabby-20.png",
    category: "recent",
    specs: {
      style: "Compact chain crossbody",
      size: "Mini / Small",
      carry: "Chain + Crossbody",
      bestFor: "Evenings / Hands-free",
      color: "Black / Brass",
      summaryNote:
        "The Tabby Chain Crossbody 19 distills our structured Signature C hardware into a compact leather silhouette with a gleaming detachable chain.",
    },
  },
];

export const DEFAULT_RECENT_COMPARE_BAGS: [BagProduct, BagProduct] = [
  BAG_CATALOG[0], // Tabby Shoulder Bag 26 ($475)
  BAG_CATALOG[6], // Tabby Chain Crossbody 19 ($295)
];

export const PLP_ROWS: [BagProduct, BagProduct][] = [
  [BAG_CATALOG[0], BAG_CATALOG[1]],
  [BAG_CATALOG[2], BAG_CATALOG[3]],
  [BAG_CATALOG[4], BAG_CATALOG[5]],
  [BAG_CATALOG[1], BAG_CATALOG[2]],
  [BAG_CATALOG[5], BAG_CATALOG[0]],
  [BAG_CATALOG[3], BAG_CATALOG[4]],
  [BAG_CATALOG[2], BAG_CATALOG[1]],
];

export const PLP_COMPARE_ROWS: [BagProduct, BagProduct][] = [
  [BAG_CATALOG[0], BAG_CATALOG[6]],
  [BAG_CATALOG[1], BAG_CATALOG[2]],
  [BAG_CATALOG[4], BAG_CATALOG[5]],
  [BAG_CATALOG[3], BAG_CATALOG[1]],
  [BAG_CATALOG[2], BAG_CATALOG[4]],
  [BAG_CATALOG[5], BAG_CATALOG[3]],
  [BAG_CATALOG[1], BAG_CATALOG[4]],
];

export const STATEMENT_CAROUSEL_BAGS: BagProduct[] = [
  BAG_CATALOG[2], // Juliet Shoulder Bag 25 ($525)
  BAG_CATALOG[0], // Tabby Shoulder Bag 26 ($475)
  BAG_CATALOG[4], // Chelsea Shoulder Bag 30 ($325)
];

export type ContentSpotMode = "general" | "prompted" | "compare";

export function getCompareSpotCopy(recentPair: [BagProduct, BagProduct]): {
  userPrompt: string;
  assistantPreview: string;
} {
  const [bagA, bagB] = recentPair;
  const bothTabby =
    bagA.name.toLowerCase().includes("tabby") &&
    bagB.name.toLowerCase().includes("tabby");

  return {
    userPrompt: bothTabby
      ? "Compare Tabby bags"
      : `Compare ${bagA.shortName} and ${bagB.shortName}`,
    assistantPreview: `Pulling up ${bagA.shortName} and ${bagB.shortName} to compare side by side`,
  };
}

export interface StarterAction {
  id: "narrow" | "outfit" | "compare" | "gift";
  label: string;
  icon: string;
  row: 1 | 2;
}

export const COLD_START_ACTIONS: StarterAction[] = [
  {
    id: "narrow",
    label: "Narrow down results in this page",
    icon: "/assets/figma/icon-feature-search.svg",
    row: 1,
  },
  {
    id: "outfit",
    label: "Match a bag to my outfit",
    icon: "/assets/figma/icon-ar-outfit.svg",
    row: 1,
  },
  {
    id: "compare",
    label: "Compare two bags",
    icon: "/assets/figma/icon-split-compare.svg",
    row: 2,
  },
  {
    id: "gift",
    label: "Help me find something for...",
    icon: "/assets/figma/icon-forum.svg",
    row: 2,
  },
];

export interface CannedReply {
  leadParagraphs: string[];
  bags?: BagProduct[];
  featuredBag?: BagProduct;
  followUpNote?: string;
  options?: string[];
}

export const STATEMENT_PROMPT = "Show me something that makes a statement";

export const OUTFIT_STARTER_PROMPT = "Match a bag to my outfit";

export const STORIES_COMPARE_PAIR: [BagProduct, BagProduct] = [
  BAG_CATALOG[2], // Juliet Shoulder Bag 25 ($525) — Quilted Leather
  BAG_CATALOG[0], // Tabby Shoulder Bag 26 ($475) — Soft Leather
];

export interface StoriesStarterCard {
  id: "two-ways" | "statement" | "going-out";
  lines: [string, string];
  prompt: string;
}

export const STORIES_STARTER_CARDS: StoriesStarterCard[] = [
  {
    id: "two-ways",
    lines: ["Can be worn", "two ways"],
    prompt: "Show me bags that can be worn two ways",
  },
  {
    id: "statement",
    lines: ["Something that", "makes a statement"],
    prompt: STATEMENT_PROMPT,
  },
  {
    id: "going-out",
    lines: ["Match my going", "out look"],
    prompt: "Match my going out look",
  },
];

export const OUTFIT_SELFIE_PREVIEW = {
  image: "/assets/figma/ad-model.png",
  title: "Your look",
  subtitle: "Cream & navy knit · Gold accents",
} as const;

export const OUTFIT_MATCH_REPLY: CannedReply = {
  leadParagraphs: [
    "Love the cream and navy knit with warm gold jewelry. Rich maple, dark cherry, and sculpted brass hardware will ground the pattern without competing with it.",
  ],
  bags: [BAG_CATALOG[1], BAG_CATALOG[4], BAG_CATALOG[0]],
  followUpNote:
    "Soft Tabby 20 in Maple echoes your warm gold accents for daytime, while Chelsea 30 in Dark Cherry adds moody contrast against denim.",
  options: [
    "Compare Soft Tabby 20 and Chelsea 30",
    "Which is best for going out?",
    "More with gold hardware",
  ],
};

export function findMentionedBagsInPrompt(prompt: string): BagProduct[] {
  const lower = prompt.toLowerCase();
  const occupied: Array<[number, number]> = [];
  const hits: Array<{ bag: BagProduct; index: number }> = [];

  const isRangeFree = (start: number, end: number) =>
    occupied.every(([s, e]) => end <= s || start >= e);

  const byLongestShortName = [...BAG_CATALOG].sort(
    (a, b) => b.shortName.length - a.shortName.length
  );

  for (const bag of byLongestShortName) {
    const needle = bag.shortName.toLowerCase();
    const idx = lower.indexOf(needle);
    if (idx !== -1 && isRangeFree(idx, idx + needle.length)) {
      occupied.push([idx, idx + needle.length]);
      hits.push({ bag, index: idx });
    }
  }

  if (hits.length < 2) {
    const keywordAliases: Array<{ bag: BagProduct; keyword: string }> = [
      { bag: BAG_CATALOG[6], keyword: "chain crossbody" },
      { bag: BAG_CATALOG[6], keyword: "tabby 19" },
      { bag: BAG_CATALOG[1], keyword: "soft tabby" },
      { bag: BAG_CATALOG[3], keyword: "ergo" },
      { bag: BAG_CATALOG[2], keyword: "juliet" },
      { bag: BAG_CATALOG[4], keyword: "chelsea" },
      { bag: BAG_CATALOG[5], keyword: "brooklyn" },
      { bag: BAG_CATALOG[0], keyword: "tabby" },
    ];

    for (const { bag, keyword } of keywordAliases) {
      if (hits.some((h) => h.bag.id === bag.id)) continue;
      const idx = lower.indexOf(keyword);
      if (idx !== -1 && isRangeFree(idx, idx + keyword.length)) {
        occupied.push([idx, idx + keyword.length]);
        hits.push({ bag, index: idx });
      }
    }
  }

  return hits.sort((a, b) => a.index - b.index).map((h) => h.bag);
}

export function getCannedReplyForPrompt(prompt: string): CannedReply {
  const lower = prompt.toLowerCase();

  if (lower.startsWith("tell me more about") || lower.startsWith("tell me about ")) {
    const mentioned = findMentionedBagsInPrompt(prompt);
    const bag = mentioned[0];
    if (bag) {
      const companion =
        BAG_CATALOG.find((candidate) => candidate.id !== bag.id) ?? BAG_CATALOG[0];
      return {
        leadParagraphs: [
          bag.specs.summaryNote,
          `Styled as a ${bag.specs.style.toLowerCase()} in ${bag.specs.color} (${bag.priceFormatted}), it offers ${bag.specs.carry.toLowerCase()} versatility suited for ${bag.specs.bestFor.toLowerCase()}.`,
        ],
        featuredBag: bag,
        followUpNote: `Would you like to add the ${bag.shortName} to your bag or view full product details?`,
        options: [
          `Compare ${bag.shortName} and ${companion.shortName}`,
          "Which is best for going out?",
          "More with gold hardware",
        ],
      };
    }
  }

  if (lower.includes("work") || lower.includes("holds more")) {
    return {
      leadParagraphs: [
        "For workdays and fuller carry, the Brooklyn 28 and Chelsea 30 offer the most generous interior room while keeping a clean, sculptural profile on the shoulder.",
      ],
      bags: [BAG_CATALOG[5], BAG_CATALOG[4], BAG_CATALOG[0]],
      followUpNote:
        "Brooklyn 28 fits daily essentials with effortless drape, while Chelsea 30 adds a structured East-West flap and detachable strap.",
      options: [
        "Compare Brooklyn 28 and Chelsea 30",
        "More with gold hardware",
        "Which is best for going out?",
      ],
    };
  }

  if (lower.includes("two ways") || lower.includes("crossbody")) {
    return {
      leadParagraphs: [
        "Convertible straps give you two distinct looks in one bag — tuck one under your arm for dinner, then clip on the long strap when you want hands-free ease.",
      ],
      bags: [BAG_CATALOG[0], BAG_CATALOG[1], BAG_CATALOG[2]],
      followUpNote:
        "Tabby 26 and Soft Tabby 20 include detachable shoulder and crossbody straps, while Juliet 25 switches between a leather strap and a sculptural chain.",
      options: [
        "Compare Tabby 26 and Soft Tabby 20",
        "Which is best for going out?",
        "More with gold hardware",
      ],
    };
  }

  if (lower.includes("going out")) {
    return {
      leadParagraphs: [
        "For evenings out, the Juliet 25 is your standout piece — quilted leather and removable chain charms catch every light without weighing you down.",
      ],
      bags: [BAG_CATALOG[2], BAG_CATALOG[1], BAG_CATALOG[0]],
      followUpNote:
        "Carry Juliet on the short chain for cocktails, or clip on the leather strap when the night keeps moving.",
      options: [
        "Compare Juliet 25 and Tabby 26",
        "Show me something more unexpected",
        "More with gold hardware",
      ],
    };
  }

  if (lower.includes("unexpected")) {
    return {
      leadParagraphs: [
        "For an unexpected twist, look to rich oxblood tones and archival silhouettes — deep cherry leather and woven jacquard feel collected rather than predictable.",
      ],
      bags: [BAG_CATALOG[4], BAG_CATALOG[3], BAG_CATALOG[5]],
      followUpNote:
        "The Chelsea 30 in Dark Cherry brings moody depth, while the Belted Ergo 26 adds heritage texture.",
      options: [
        "Which is best for going out?",
        "More with gold hardware",
        "Compare two bags",
      ],
    };
  }

  if (lower.includes("gold") || lower.includes("brass") || lower.includes("hardware")) {
    return {
      leadParagraphs: [
        "Warm brass hardware gives structured leather an unmistakable Coach signature — bold enough to read as jewelry against a minimalist coat or dress.",
      ],
      bags: [BAG_CATALOG[0], BAG_CATALOG[2], BAG_CATALOG[1]],
      followUpNote:
        "Tabby 26 showcases our sculpted Signature C clasp, while Juliet 25 pairs brass links with playful charms.",
      options: [
        "Which is best for going out?",
        "Show me something more unexpected",
        "Compare two bags",
      ],
    };
  }

  if (lower.includes("narrow")) {
    return {
      leadParagraphs: [
        "From these 172 handbags, here are the three most-loved shoulder silhouettes balancing everyday ease with signature Coach craft.",
      ],
      bags: [BAG_CATALOG[0], BAG_CATALOG[5], BAG_CATALOG[4]],
      followUpNote:
        "Prefer a structured flap like the Tabby, or an easy drape like the Brooklyn 28?",
      options: [
        "Show me something that makes a statement",
        "Which is best for going out?",
        "More with gold hardware",
      ],
    };
  }

  if (lower.includes("outfit")) {
    return {
      leadParagraphs: [
        "Tell me what you're wearing — denim and a trench, tailored suiting, or an evening slip — or start with one of these versatile statement shapes.",
      ],
      bags: [BAG_CATALOG[1], BAG_CATALOG[2], BAG_CATALOG[4]],
      followUpNote:
        "Warm maple and dark cherry pair effortlessly with cream, navy, and black wardrobes.",
      options: [
        "Which is best for going out?",
        "Show me something that makes a statement",
        "More with gold hardware",
      ],
    };
  }

  if (lower.includes("compare feature")) {
    return {
      leadParagraphs: [
        "Looking closer at interior layout and strap versatility: structured flaps keep essentials compartmentalized, while crescent hobos give quick one-zip access.",
      ],
      options: [
        "Which holds more for work?",
        "Which is best for going out?",
        "Help me with something else",
      ],
    };
  }

  if (lower.includes("something else")) {
    return {
      leadParagraphs: [
        "Of course — tell me who you’re shopping for, an occasion, or a silhouette you love, and I’ll curate the best matches.",
      ],
      bags: STATEMENT_CAROUSEL_BAGS,
      options: [
        "Show me something that makes a statement",
        "Which is best for going out?",
        "More with gold hardware",
      ],
    };
  }

  // Canonical Figma "statement" reply (also default for free-typed prompts & gift starter)
  return {
    leadParagraphs: [
      "Statement styles come down to the details: Signature print, an archival kisslock, a color with real depth.",
      "Pair one with something simple and it carries the whole look.",
    ],
    bags: STATEMENT_CAROUSEL_BAGS,
    followUpNote:
      "Wear the Tabby when you want every light to find you. Reach for the Juliet 25 when you want quilted texture and charm detail. Choose the Chelsea when you want to keep it moody in dark cherry.",
    options: [
      "Which is best for going out?",
      "Show me something more unexpected",
      "More with gold hardware",
    ],
  };
}
