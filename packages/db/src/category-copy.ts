// Labels, examples and AI instructions per spec category (docs/category-labels.md,
// founder-approved 2026-10-07). The stored fields are the same for every
// product; only the words change, so a wine never shows footwear labels.
// Pure data: client components get it as props (this package also loads pg).
import type { SpecCategory } from "./spec-templates.js";

export interface FieldCopy {
  label: string;         // product editor, customer-page heading, assistant, staff view
  example: string;       // grey placeholder in the product editor
  instruction: string;   // what Generate writes in this field
}

export interface CategoryCopy {
  productNameExample: string;
  backstoryExample: string;
  // The four fields whose meaning changes by category, in display order.
  fields: { materials: FieldCopy; fit_notes: FieldCopy; care_instructions: FieldCopy; sustainability_notes: FieldCopy };
  greatWhenExample: [string, string, string];
  greatWhenHint: string;
  reasonsExample: string[];
  awardsExample: string[];
  faqExample: { question: string; answer: string };
  staffNameExample: string;
  staffQuoteExample: string;
  internalNotesExample: string;
  extraImagesHint: string;
  facts: { topics: string[]; defaultTopic: string; example: string; websiteExample: string };
  training: {
    oneLineSellExample: string;
    whoItsForExample: string;
    whoItsNotForExample: string;
    truth: { label: string; hint: string; example: string };   // stored as fit_and_sizing
    worthExample: [string, string, string];
    closestAlternativeExample: string;
    questionExample: { question: string; answer: string };
    companionExample: string;
    brandExample: string;
    stockNoteExample: string;
  };
}

const f = (label: string, example: string, instruction: string): FieldCopy => ({ label, example, instruction });

const SUSTAINABILITY_INSTRUCTION = "One sentence if genuinely applicable. Empty string if nothing meaningful is known.";
const GREAT_WHEN_HINT = "The 3 key points customers see first. Name the situation it's for, one per line, finishing \u201cGreat when…\u201d";
// Alcohol marketing rules (founder 2026-10-07, pending legal review): taste, food,
// serving, gifting; never mood, effects, success or drinking more.
const DRINK_GREAT_WHEN_HINT = "The 3 key points customers see first. Name a taste, food or moment it suits, one per line, finishing \u201cGreat when…\u201d. No moods or effects.";
const IMAGES_HINT = "One URL per line — detail shots, lifestyle images, packaging";
const CLOTHING_TOPICS = ["materials", "construction", "fit", "sizing", "care", "origin", "features", "other"];
const DRINK_IMAGES_HINT = "One URL per line — the label, the bottle or can, the producer";

const apparel: CategoryCopy = {
  productNameExample: "e.g. Merino Crewneck",
  backstoryExample: "Brand origin or product design story…",
  fields: {
    materials: f("Materials & construction", "Key materials, fabric weight, construction details…", "One sentence. Key material(s) and one standout construction detail. No padding."),
    fit_notes: f("Fit & feel", "Sizing, fit, or how to wear it…", "One sentence on sizing, fit, or styling."),
    care_instructions: f("Care instructions", "Machine wash cold, lay flat to dry…", "One plain sentence, e.g. 'Machine wash cold, reshape and air dry.'"),
    sustainability_notes: f("Sustainability", "Certified organic cotton, carbon-neutral shipping, made in Portugal…", SUSTAINABILITY_INSTRUCTION),
  },
  greatWhenExample: ["you want warmth without bulk", "it's cold but not snowing", "you layer under a coat"],
  greatWhenHint: GREAT_WHEN_HINT,
  reasonsExample: ["Ethically sourced merino", "Warm yet breathable", "Lifetime repair guarantee"],
  awardsExample: ["B Corp Certified", "As seen in Vogue, March 2024"],
  faqExample: { question: "Is this suitable for cold weather?", answer: "Yes — the merino wool retains warmth even when damp…" },
  staffNameExample: "Alex, Senior Stylist",
  staffQuoteExample: "\"This is my go-to piece every winter.\"",
  internalNotesExample: "Fragile clasp — handle with care when demonstrating…",
  extraImagesHint: IMAGES_HINT,
  facts: { topics: CLOTHING_TOPICS, defaultTopic: "fit", example: "Runs half a size large", websiteExample: "northfield.com" },
  training: {
    oneLineSellExample: "The jacket we recommend when someone wants one that does everything.",
    whoItsForExample: "Commuters, people who run hot, anyone who wants one jacket that does everything.",
    whoItsNotForExample: "Not warm enough for below zero; not for a slim, tailored look.",
    truth: { label: "Fit and sizing truth", hint: "The honest version, not the tag version.", example: "Runs a size small. Size up if you're between sizes." },
    worthExample: ["The merino doesn't pill or hold smells.", "Made to be repaired, not replaced.", "Holds its shape after years of washing."],
    closestAlternativeExample: "Similar to the Road Runner but warmer and less structured.",
    questionExample: { question: "Does it shrink?", answer: "Not if you wash it cold and lay it flat." },
    companionExample: "We usually sell this with the merino socks. Most customers grab both.",
    brandExample: "Family-run since 1952; everything is made in their own mill…",
    stockNoteExample: "Medium is display only. Restock of smalls arriving next week.",
  },
};

const footwear: CategoryCopy = {
  productNameExample: "e.g. Weekend Chukka",
  backstoryExample: "The brand, the workshop, what makes this pair special…",
  fields: {
    materials: f("Materials & construction", "Full-grain suede upper, Goodyear-welted rubber sole…", "One sentence. Upper, lining and sole materials and one construction detail (e.g. Goodyear welt)."),
    fit_notes: f("Fit & sizing", "Runs half a size large; wide sizes available…", "One sentence on fit and sizing: true to size, width, break-in."),
    care_instructions: f("Care", "Brush suede dry; use a protector spray…", "One plain sentence on care, e.g. 'Brush suede dry; use a protector spray.'"),
    sustainability_notes: f("Sustainability", "Leather from a Gold-rated LWG tannery…", SUSTAINABILITY_INSTRUCTION),
  },
  greatWhenExample: ["you need one boot from office to bar", "it's wet but not snowing", "you hate breaking shoes in"],
  greatWhenHint: GREAT_WHEN_HINT,
  reasonsExample: ["Resoleable", "Comfortable from day one", "Made in Portugal"],
  awardsExample: ["Esquire's best boots 2025"],
  faqExample: { question: "Does it run true to size?", answer: "Half a size large, so go down half a size." },
  staffNameExample: "Alex, Store manager",
  staffQuoteExample: "\"The pair I'd buy if I could only own one.\"",
  internalNotesExample: "Display pair is a 9; check stock before promising a size…",
  extraImagesHint: IMAGES_HINT,
  facts: { topics: CLOTHING_TOPICS, defaultTopic: "sizing", example: "Runs half a size large", websiteExample: "redwingshoes.com" },
  training: {
    oneLineSellExample: "This is the shoe we recommend when someone wants one pair that does everything.",
    whoItsForExample: "People on their feet all day, anyone who wants one smart-casual pair.",
    whoItsNotForExample: "Not ideal for wide feet; not for deep snow.",
    truth: { label: "Fit and sizing truth", hint: "The honest version, not the tag version.", example: "Runs half a size small. Size up. Wide feet should go a full size up." },
    worthExample: ["The sole can be replaced, so they last for years.", "The leather ages well.", "Genuine resale value if kept clean."],
    closestAlternativeExample: "Similar to the Desert Boot but with a stiffer sole.",
    questionExample: { question: "Does this crease?", answer: "Yes, that's normal with leather — here's what to do about it." },
    companionExample: "Most customers add the suede protector spray.",
    brandExample: "Family-run since 1952; every pair is resoleable…",
    stockNoteExample: "Size 9 is display only. Restock of 10s arriving next week.",
  },
};

const eyewear: CategoryCopy = {
  productNameExample: "e.g. Erika Classic",
  backstoryExample: "The brand and the design story behind this frame…",
  fields: {
    materials: f("Lenses & frame", "Polarised glass lenses, hand-polished acetate frame…", "One sentence on the lens type and the frame material."),
    fit_notes: f("Fit & sizing", "Medium fit, 54 mm lenses, suits narrower faces…", "One sentence on frame size and fit, e.g. lens width and the faces it suits."),
    care_instructions: f("Care", "Clean with the microfibre cloth; store in the case…", "One plain sentence on cleaning and storing them."),
    sustainability_notes: f("Sustainability", "Bio-acetate frame, recycled case…", SUSTAINABILITY_INSTRUCTION),
  },
  greatWhenExample: ["you drive a lot in bright sun", "you're on the water", "you want one pair for everything"],
  greatWhenHint: GREAT_WHEN_HINT,
  reasonsExample: ["100% UV protection", "Polarised", "Prescription-ready"],
  awardsExample: ["Red Dot design award 2024"],
  faqExample: { question: "Can it take prescription lenses?", answer: "Yes, single-vision and progressive." },
  staffNameExample: "Alex, Optician",
  staffQuoteExample: "\"The pair I reach for on the drive to the cottage.\"",
  internalNotesExample: "Demo pair has clear lenses; the polarised version is boxed…",
  extraImagesHint: IMAGES_HINT,
  facts: { topics: ["lenses", "frame", "fit", "protection", "care", "origin", "other"], defaultTopic: "lenses", example: "Lenses are polarised glass", websiteExample: "rayban.com" },
  training: {
    oneLineSellExample: "The pair we recommend when someone wants one pair for driving and the beach.",
    whoItsForExample: "Drivers, anglers, anyone who squints in bright sun.",
    whoItsNotForExample: "Not for wide faces; polarised lenses can hide some phone screens.",
    truth: { label: "Fit truth", hint: "The honest version, not the tag version.", example: "Runs narrow. Wide faces should try the 58 mm size." },
    worthExample: ["Glass lenses don't scratch like plastic.", "Hinges are replaceable.", "Lifetime frame warranty."],
    closestAlternativeExample: "Like the Wayfarer but lighter and a little smaller.",
    questionExample: { question: "Will they go over my glasses?", answer: "No, but they take prescription lenses." },
    companionExample: "Most customers add the hard case.",
    brandExample: "Designed in Italy; they still polish frames by hand…",
    stockNoteExample: "Demo pair only in tortoise; black is boxed.",
  },
};

const cannabis: CategoryCopy = {
  productNameExample: "e.g. Animal Face 3.5 g",
  backstoryExample: "Who grew it and what makes this cut special…",
  fields: {
    materials: f("Grow & cure", "Hang-dried, hand-trimmed, cold-cured; small-batch greenhouse…", "One sentence on how it was grown, dried, trimmed and cured, as the sources state it."),
    fit_notes: f("Aroma & flavour", "Lemon and cake up front, with pepper and pine…", "One sentence on aroma and flavour notes, as the sources state them. No effects."),
    care_instructions: f("Storage", "Keep sealed, cool and dark, out of reach of children…", "One plain sentence on how to store it (sealed, cool, dark)."),
    sustainability_notes: f("Packaging", "Glass jar, recyclable lid, nitrogen-flushed…", "One sentence on the packaging if known. Empty string if nothing meaningful is known."),
  },
  greatWhenExample: ["you want a limonene-forward sativa-dominant hybrid", "you prefer hand-trimmed, cold-cured flower", "you're after Seed Junky genetics"],
  greatWhenHint: "The 3 key points customers see first. Name a factual quality it has, one per line, finishing \u201cGreat when…\u201d. No effects or occasions.",
  reasonsExample: ["Hand-selected from 100 phenos", "Cold-cured for terpene retention", "Small-batch greenhouse"],
  awardsExample: ["KIND Awards 2021: Craft Brand of the Year"],
  faqExample: { question: "What's the lineage?", answer: "Face Off OG × Animal Mints." },
  // Not shown: no staff quotes for cannabis (Cannabis Act, PRD v4 §10).
  staffNameExample: "Sam, Budtender",
  staffQuoteExample: "(not shown for cannabis)",
  internalNotesExample: "Check the packaged date; older lots go to the front…",
  extraImagesHint: "One URL per line — detail shots and packaging. No lifestyle images for cannabis",
  facts: { topics: ["strain", "lineage", "grow", "aroma", "terpenes", "potency", "format", "producer", "other"], defaultTopic: "grow", example: "Hang-dried for 10–14 days", websiteExample: "carmelcannabis.ca" },
  training: {
    oneLineSellExample: "Our pick when someone asks for a limonene-heavy sativa-dominant hybrid.",
    whoItsForExample: "Customers who ask for sativa-dominant strains, terpene hunters, craft-flower regulars.",
    whoItsNotForExample: "Not for anyone after a low-THC or CBD-heavy product.",
    truth: { label: "Potency and freshness truth", hint: "The honest version, not the packaging version.", example: "Tests at the top of its range. Older lots lose terpenes; check the packaged date." },
    worthExample: ["Hand-trimmed, so less waste per gram.", "Cold-cured for terpene retention.", "Small batches, packaged fresh."],
    closestAlternativeExample: "Similar terpene profile to the Lemon Cherry Gelato, lower THC.",
    questionExample: { question: "When was it packaged?", answer: "Check the date on the label; this lot was packaged last month." },
    companionExample: "Customers often ask for a grinder or the 1 g pre-roll to try first.",
    brandExample: "Small craft grower in Oro-Medonte; hang-dried and hand-trimmed…",
    stockNoteExample: "3.5 g in stock; 7 g sold out until next week's delivery.",
  },
};

const wine: CategoryCopy = {
  productNameExample: "e.g. Campofiorin 2020",
  backstoryExample: "The estate, the family, how this wine came to be…",
  fields: {
    materials: f("Winemaking", "Ripasso method: refermented on Amarone skins, 18 months in oak…", "One sentence on how it's made: method, oak, ageing."),
    fit_notes: f("Tasting notes", "Cherry and plum, soft tannins, a long spiced finish…", "One sentence of tasting notes: aroma, palate, finish."),
    care_instructions: f("Serving & storage", "Serve at 16–18 °C; decant 30 minutes; drink by 2030…", "One sentence on serving temperature, decanting and how long to keep it."),
    sustainability_notes: f("Farming", "Certified organic vineyards, hand-harvested…", "One sentence on farming (organic, biodynamic, sustainable certifications). Empty string if nothing meaningful is known."),
  },
  greatWhenExample: ["you're cooking a slow braise", "you want a red with depth under $30", "you're bringing a bottle to dinner"],
  greatWhenHint: DRINK_GREAT_WHEN_HINT,
  reasonsExample: ["Ripasso method", "Pairs with braised meats", "Drinks above its price"],
  awardsExample: ["Gambero Rosso Tre Bicchieri 2022", "92 pts, Wine Spectator"],
  faqExample: { question: "What does it pair with?", answer: "Braised beef, mushroom risotto, aged cheese." },
  staffNameExample: "Sam, Sommelier",
  staffQuoteExample: "\"My pick for a Sunday roast.\"",
  internalNotesExample: "Often confused with the Valpolicella Classico; show the label…",
  extraImagesHint: DRINK_IMAGES_HINT,
  facts: { topics: ["grapes", "region", "winemaking", "tasting", "pairing", "serving", "other"], defaultTopic: "winemaking", example: "Aged 18 months in Slavonian oak", websiteExample: "masi.it" },
  training: {
    oneLineSellExample: "The red we recommend when someone wants Amarone character without the Amarone price.",
    whoItsForExample: "Red drinkers who like richness, people cooking braises, gift buyers under $30.",
    whoItsNotForExample: "Not for anyone after a light, crisp red.",
    truth: { label: "Style and serving truth", hint: "The honest version, not the back label.", example: "Bigger than the label suggests. Give it 30 minutes in a decanter." },
    worthExample: ["Ripasso method gives Amarone character at a third of the price.", "Ages well for 5+ years.", "Consistently scores 90+."],
    closestAlternativeExample: "Like the Ripasso from Zenato, a little softer.",
    questionExample: { question: "Does it need decanting?", answer: "Thirty minutes helps; it opens up a lot." },
    companionExample: "Customers often ask what cheese to serve with it.",
    brandExample: "Family estate in Valpolicella since 1772…",
    stockNoteExample: "Two cases left of the 2020; the 2021 arrives next month.",
  },
};

const beer: CategoryCopy = {
  productNameExample: "e.g. Headstock IPA 4-pack",
  backstoryExample: "The brewery and the idea behind this beer…",
  fields: {
    materials: f("Brewing", "Double dry-hopped with Citra and Mosaic, unfiltered…", "One sentence on the style, hops, malt and brewing method."),
    fit_notes: f("Tasting notes", "Mango and pine, soft bitterness, hazy and juicy…", "One sentence of tasting notes: aroma, flavour, bitterness."),
    care_instructions: f("Serving & storage", "Keep cold; best within 3 months; serve at 6–8 °C…", "One sentence on storing and serving it (cold, freshness, temperature)."),
    sustainability_notes: f("Sustainability", "Spent grain goes to local farms…", SUSTAINABILITY_INSTRUCTION),
  },
  greatWhenExample: ["you want a hazy IPA that isn't too bitter", "you're grilling", "you like tropical hops"],
  greatWhenHint: DRINK_GREAT_WHEN_HINT,
  reasonsExample: ["Double dry-hopped", "Brewed in Toronto", "Canned fresh every week"],
  awardsExample: ["Canadian Brewing Awards 2025: gold"],
  faqExample: { question: "How bitter is it?", answer: "Soft: 45 IBU." },
  staffNameExample: "Jo, Beer buyer",
  staffQuoteExample: "\"The IPA for people who say they don't like IPAs.\"",
  internalNotesExample: "Keep the display can cold; warm cans foam…",
  extraImagesHint: DRINK_IMAGES_HINT,
  facts: { topics: ["style", "ingredients", "brewing", "tasting", "pairing", "serving", "other"], defaultTopic: "style", example: "6.5% hazy IPA", websiteExample: "bellwoodsbrewery.com" },
  training: {
    oneLineSellExample: "The IPA we recommend to people who find most IPAs too bitter.",
    whoItsForExample: "Hazy IPA fans, people new to craft beer.",
    whoItsNotForExample: "Not for anyone who wants a crisp, bitter West Coast IPA.",
    truth: { label: "Style and freshness truth", hint: "The honest version, not the can version.", example: "Best within 6 weeks of canning; check the date on the bottom." },
    worthExample: ["Canned weekly, so it's always fresh.", "Small-batch hops you won't find in big brands.", "Brewed ten minutes away."],
    closestAlternativeExample: "Like Juicy Ass but less sweet.",
    questionExample: { question: "How long does it keep?", answer: "Best within 3 months; keep it cold." },
    companionExample: "Customers often ask about the brewery's pale ale too.",
    brandExample: "Small Toronto brewery; everything is canned in-house…",
    stockNoteExample: "Singles in the fridge; 4-packs restocked Fridays.",
  },
};

const spirits: CategoryCopy = {
  productNameExample: "e.g. Glenfarclas 12",
  backstoryExample: "The distillery and what sets this bottling apart…",
  fields: {
    materials: f("Production", "Pot-distilled, aged 12 years in ex-sherry casks…", "One sentence on how it's made: distillation, cask and age."),
    fit_notes: f("Tasting notes", "Dried fruit, toffee and a hint of smoke…", "One sentence of tasting notes: nose, palate, finish."),
    care_instructions: f("Serving", "Neat or with a drop of water; keep upright…", "One sentence on how to serve it (neat, with water, in cocktails)."),
    sustainability_notes: f("Sustainability", "Spent grain to local farms; recycled glass…", SUSTAINABILITY_INSTRUCTION),
  },
  greatWhenExample: ["you want a sherried Scotch under $90", "you're starting a whisky shelf", "you like it neat"],
  greatWhenHint: DRINK_GREAT_WHEN_HINT,
  reasonsExample: ["Sherry-cask aged", "Family-owned since 1865", "Great value for 12 years"],
  awardsExample: ["San Francisco World Spirits 2024: double gold"],
  faqExample: { question: "Is it peated?", answer: "Lightly: a hint of smoke." },
  staffNameExample: "Kim, Spirits specialist",
  staffQuoteExample: "\"The dram I pour for whisky sceptics.\"",
  internalNotesExample: "Locked cabinet: key at the till…",
  extraImagesHint: DRINK_IMAGES_HINT,
  facts: { topics: ["production", "cask & age", "tasting", "serving", "origin", "other"], defaultTopic: "cask & age", example: "Finished in ex-sherry casks", websiteExample: "glenfarclas.com" },
  training: {
    oneLineSellExample: "The Scotch we recommend when someone wants sherry-cask richness without the price.",
    whoItsForExample: "Sherried-whisky fans, gift buyers, people starting a collection.",
    whoItsNotForExample: "Not for anyone after a heavily peated Islay.",
    truth: { label: "Style and strength truth", hint: "The honest version, not the label version.", example: "Richer than most 12-year-olds. A drop of water opens it up." },
    worthExample: ["12 years in sherry casks at a 10-year price.", "Family-owned, independent distillery.", "Bottled at 43%, no colouring added."],
    closestAlternativeExample: "Like the Macallan 12 Sherry Oak at two-thirds the price.",
    questionExample: { question: "Is it peated?", answer: "Only lightly: a hint of smoke." },
    companionExample: "Customers often ask about the 15-year-old too.",
    brandExample: "Family-owned since 1865; all sherry casks…",
    stockNoteExample: "Last two bottles; next allocation in spring.",
  },
};

const home: CategoryCopy = {
  productNameExample: "e.g. Linen Duvet Cover, Queen",
  backstoryExample: "The maker and the story behind this piece…",
  fields: {
    materials: f("Materials", "Stonewashed European linen, 170 gsm…", "One sentence on the materials and how it's made."),
    fit_notes: f("Size & feel", "Fits mattresses up to 40 cm deep; soft, relaxed drape…", "One sentence on dimensions or size and how it feels."),
    care_instructions: f("Care", "Machine wash warm, tumble dry low…", "One plain sentence on care."),
    sustainability_notes: f("Sustainability", "OEKO-TEX certified, plastic-free packaging…", SUSTAINABILITY_INSTRUCTION),
  },
  greatWhenExample: ["you sleep hot", "you like a relaxed, lived-in look", "you want bedding that softens with every wash"],
  greatWhenHint: GREAT_WHEN_HINT,
  reasonsExample: ["Gets softer with every wash", "Breathable for warm sleepers", "OEKO-TEX certified"],
  awardsExample: ["Featured in Dwell, 2025"],
  faqExample: { question: "Will it shrink?", answer: "It's pre-washed, so very little." },
  staffNameExample: "Alex, Interior stylist",
  staffQuoteExample: "\"I own it in three colours.\"",
  internalNotesExample: "Display set is a queen; kings are boxed…",
  extraImagesHint: IMAGES_HINT,
  facts: { topics: ["materials", "dimensions", "care", "origin", "certifications", "other"], defaultTopic: "materials", example: "Pre-washed for softness", websiteExample: "parachutehome.com" },
  training: {
    oneLineSellExample: "The bedding we recommend to anyone who sleeps hot.",
    whoItsForExample: "Hot sleepers, people who like a relaxed look.",
    whoItsNotForExample: "Not for anyone who wants crisp, ironed sheets.",
    truth: { label: "Size and fit truth", hint: "The honest version, not the tag version.", example: "Runs small: the queen fits mattresses up to 35 cm deep." },
    worthExample: ["Linen lasts decades with care.", "Pre-washed, so no shrinking.", "Breathable all year."],
    closestAlternativeExample: "Like the percale set but softer and less crisp.",
    questionExample: { question: "Will it wrinkle?", answer: "Yes, that's the relaxed look; it softens over time." },
    companionExample: "Customers often add the matching pillowcases.",
    brandExample: "Woven in Portugal by a family mill…",
    stockNoteExample: "Queen in stock in sand; kings are special order.",
  },
};

// docs/category-beauty.md (founder-approved 2026-10-13). Canadian cosmetic
// rules: appearance and feel only, never treatment.
const beauty: CategoryCopy = {
  productNameExample: "e.g. Soft Matte Lip Cream, 03",
  backstoryExample: "The brand and what makes this formula different…",
  fields: {
    materials: f("Key ingredients", "Hyaluronic acid and squalane; fragrance-free…", "One sentence on the key ingredients, as the brand lists them. Never invent an ingredient."),
    fit_notes: f("Shade & finish", "Buildable sheer-to-medium coverage, satin finish; 24 shades…", "One sentence on shade range, coverage and finish, as the sources state them."),
    care_instructions: f("How to use", "Apply with fingertips or a damp sponge; layer under SPF…", "One plain sentence on how to apply or use it."),
    sustainability_notes: f("Sustainability & ethics", "Leaping Bunny certified; refillable compact…", "One sentence on certifications (vegan, cruelty-free) or packaging, only if a source states them. Empty string if nothing meaningful is known."),
  },
  greatWhenExample: ["you want a matte lip that doesn't dry out", "you have oily skin and want it to last", "you want one shade from day to night"],
  greatWhenHint: GREAT_WHEN_HINT,
  reasonsExample: ["24 shades", "Fragrance-free", "Vegan and cruelty-free"],
  awardsExample: ["Allure Best of Beauty 2025"],
  faqExample: { question: "Is it fragrance-free?", answer: "Yes, no added fragrance." },
  staffNameExample: "Jess, Makeup artist",
  staffQuoteExample: "\"The only matte lip I re-apply once a day.\"",
  internalNotesExample: "Testers are in the drawer; swap them every month…",
  extraImagesHint: "One URL per line — swatches, texture shots, packaging",
  facts: { topics: ["ingredients", "shade", "finish", "skin type", "how to use", "free-from", "certifications", "size", "other"], defaultTopic: "ingredients", example: "Fragrance-free and vegan", websiteExample: "glossier.com" },
  training: {
    oneLineSellExample: "The matte lip we recommend to people who hate how drying most mattes are.",
    whoItsForExample: "People who want a long-lasting lip, makeup minimalists, gift buyers.",
    whoItsNotForExample: "Not for anyone after a high-shine gloss.",
    truth: { label: "Shade and longevity truth", hint: "The honest version, not the box version.", example: "Runs warm: most customers go one shade lighter. Lasts about 4 hours, not 8." },
    worthExample: ["One coat covers; the tube lasts months.", "Doesn't settle into lip lines.", "Shade range covers deep skin tones properly."],
    closestAlternativeExample: "Like the Velvet Lip but less drying, with fewer shades.",
    questionExample: { question: "Will it transfer onto a mask or cup?", answer: "A little in the first 10 minutes, then it sets." },
    companionExample: "Customers often add the matching lip liner.",
    brandExample: "Founded by a makeup artist; every shade is tested on a range of skin tones…",
    stockNoteExample: "Shade 03 sold out; restock due next week.",
  },
};

// docs/category-toys-vintage.md (founder-approved 2026-10-13). Toys: written to
// the adult buyer; ages and safety only as the packaging states them.
const toys: CategoryCopy = {
  productNameExample: "e.g. Wooden Stacking Blocks",
  backstoryExample: "Who makes it, and why…",
  fields: {
    materials: f("Materials & safety", "Solid beech, water-based paints; no small parts…", "One sentence on materials and safety, only as the packaging or sources state them. Never invent a certification or safety claim."),
    fit_notes: f("Ages & play", "Best for ages 3–6; open-ended building…", "One sentence on the age range (as on the packaging) and how it's played with. No developmental or health claims."),
    care_instructions: f("Care", "Wipe with a damp cloth; don't soak…", "One plain sentence on cleaning and care."),
    sustainability_notes: f("Who made it", "Hand-knit by a women's cooperative in Peru…", "One sentence on who made it and how, only if a source states it. Empty string if nothing meaningful is known."),
  },
  greatWhenExample: ["you want a toy with no batteries", "you're buying for a 3-year-old who loves building", "you want a gift that lasts past the toddler years"],
  greatWhenHint: GREAT_WHEN_HINT,
  reasonsExample: ["No batteries, no screens", "Made from natural materials", "Built to be handed down"],
  awardsExample: ["Canadian Toy Testing Council: Three Star Award 2025"],
  faqExample: { question: "What age is it for?", answer: "3 and up: no small parts." },
  staffNameExample: "Rebecca, Owner",
  staffQuoteExample: "\"The toy my kids still play with five years later.\"",
  internalNotesExample: "Display set is missing one block; sell from the boxed stock…",
  extraImagesHint: "One URL per line — the toy, the box, a close-up of the materials",
  facts: { topics: ["ages", "safety", "materials", "made-by", "play", "care", "other"], defaultTopic: "ages", example: "Ages 3+, no small parts", websiteExample: "plantoys.com" },
  training: {
    oneLineSellExample: "The toy we recommend when parents want something with no batteries that lasts.",
    whoItsForExample: "Toddlers who love building, parents avoiding plastic, gift buyers.",
    whoItsNotForExample: "Not for under-3s; not for kids who want electronic toys.",
    truth: { label: "Age and durability truth", hint: "The honest version, not the box version.", example: "Says 3+, but the pieces are fiddly; best from 4." },
    worthExample: ["Solid wood survives years of play.", "Non-toxic paints.", "Grows with the child: more ways to play at 5 than at 3."],
    closestAlternativeExample: "Like the rainbow stacker, but more pieces and more open-ended.",
    questionExample: { question: "Is the paint safe if they chew it?", answer: "It's water-based and non-toxic, per the maker; check the box." },
    companionExample: "Parents often add the matching storage bag.",
    brandExample: "Made in Thailand from rubberwood trees that no longer produce latex…",
    stockNoteExample: "Two boxed sets left; more arriving in two weeks.",
  },
};

// Vintage: one-of-a-kind pieces. Written from the owner's notes; never invents
// an era, maker, provenance, condition or value.
const vintage: CategoryCopy = {
  productNameExample: "e.g. Teak Sideboard, 1960s",
  backstoryExample: "The piece's story: where it's from and why you love it…",
  fields: {
    materials: f("Materials & maker", "Teak and brass; Danish, maker unmarked…", "One sentence on materials and maker, only as the owner or sources state them."),
    fit_notes: f("Size & condition", "30 × 20 cm; light scuffs on the base, no chips…", "One sentence on dimensions and condition, only as the owner states them."),
    care_instructions: f("Care", "Dust with a soft cloth; oil the teak once a year…", "One plain sentence on care."),
    sustainability_notes: f("Provenance", "From a Dundas estate; one owner since 1968…", "One sentence on where it came from, only if the owner states it. Empty string if unknown."),
  },
  greatWhenExample: ["you're furnishing with one-of-a-kind pieces", "you love mid-century design", "you'd rather buy old than new"],
  greatWhenHint: GREAT_WHEN_HINT,
  reasonsExample: ["One of a kind", "Solid teak", "Original finish"],
  awardsExample: ["Featured in Hamilton Magazine, 2025"],
  faqExample: { question: "Is it the original finish?", answer: "Yes, never refinished." },
  staffNameExample: "Sam, Owner",
  staffQuoteExample: "\"The piece I almost kept for myself.\"",
  internalNotesExample: "Price is firm; the matching chair is in the cave…",
  extraImagesHint: "One URL per line — every side, any marks or maker's stamp, close-ups of the condition",
  facts: { topics: ["era", "maker", "materials", "condition", "provenance", "dimensions", "other"], defaultTopic: "era", example: "Stamped \"Made in Denmark\" underneath", websiteExample: "dansk.com" },
  training: {
    oneLineSellExample: "A genuine 1960s Danish piece in original condition, and the only one we have.",
    whoItsForExample: "Mid-century collectors, people furnishing a first home with character.",
    whoItsNotForExample: "Not for anyone who wants a perfect, as-new finish.",
    truth: { label: "Condition truth", hint: "Every mark, before the customer finds it.", example: "Small chip on the lid; point it out before they ask." },
    worthExample: ["Solid teak, not veneer.", "Original hardware.", "Built to last another 60 years."],
    closestAlternativeExample: "The walnut cabinet upstairs is newer, with more storage.",
    questionExample: { question: "Can you hold it for me?", answer: "We can hold it for 48 hours with a deposit." },
    companionExample: "The matching side table is in the cave.",
    brandExample: "Sourced from estates around Hamilton and the Niagara region…",
    stockNoteExample: "On hold for a customer until Friday.",
  },
};

const general: CategoryCopy = {
  productNameExample: "e.g. Product name",
  backstoryExample: "Brand origin or product story…",
  fields: {
    materials: f("Materials & construction", "What it's made of and how…", "One sentence on what it's made of and one standout detail."),
    fit_notes: f("Size & fit", "Size, capacity, or how it's used…", "One sentence on size, capacity or how it's used. Empty string if not relevant."),
    care_instructions: f("Care", "How to look after it…", "One plain sentence on care. Empty string if not relevant."),
    sustainability_notes: f("Sustainability", "Certifications, sourcing, packaging…", SUSTAINABILITY_INSTRUCTION),
  },
  greatWhenExample: ["you want one that lasts", "you're buying a gift", "you like the simple version of things"],
  greatWhenHint: GREAT_WHEN_HINT,
  reasonsExample: ["Well made", "Built to last", "Great value"],
  awardsExample: ["Award or press mention"],
  faqExample: { question: "A question customers ask", answer: "The answer…" },
  staffNameExample: "Alex, Store manager",
  staffQuoteExample: "\"The one I recommend most.\"",
  internalNotesExample: "Notes for the team…",
  extraImagesHint: IMAGES_HINT,
  facts: { topics: CLOTHING_TOPICS, defaultTopic: "features", example: "Comes with a 2-year warranty", websiteExample: "brandname.com" },
  training: {
    oneLineSellExample: "The one we recommend when someone wants the simple, reliable option.",
    whoItsForExample: "2–3 kinds of customer it genuinely suits.",
    whoItsNotForExample: "Who it isn't right for.",
    truth: { label: "Size and fit truth", hint: "The honest version, not the tag version.", example: "Smaller than it looks in photos." },
    worthExample: ["Built to last.", "Backed by a long warranty.", "Better made than the cheaper versions."],
    closestAlternativeExample: "Similar to … but …",
    questionExample: { question: "Does it come with a warranty?", answer: "Yes, two years." },
    companionExample: "What customers usually buy with it.",
    brandExample: "Why you carry this brand…",
    stockNoteExample: "One left on display; more arriving next week.",
  },
};

export const CATEGORY_COPY: Record<SpecCategory, CategoryCopy> = { apparel, footwear, eyewear, beauty, cannabis, wine, beer, spirits, toys, vintage, home, general };

export function copyFor(category: SpecCategory): CategoryCopy {
  return CATEGORY_COPY[category];
}

// Every topic any category uses: a fact keeps a valid topic if the product's
// category changes.
export const ALL_FACT_TOPICS: string[] = [...new Set(Object.values(CATEGORY_COPY).flatMap((c) => c.facts.topics))];
