import type {
  RoadmapArea,
  RoadmapItem,
  RoadmapStage,
} from "@/lib/roadmap-types";

export const stageInfo: Record<
  RoadmapStage,
  { label: string; world: string; blurb: string; tone: string }
> = {
  dev: {
    label: "In development",
    world: "World 4 (private)",
    blurb: "",
    tone: "text-rune-blue border-rune-blue/40 bg-rune-blue/10",
  },
  beta: {
    label: "Beta",
    world: "World 3",
    blurb: "",
    tone: "text-gold-500 border-gold-500/40 bg-gold-500/10",
  },
  live: {
    label: "Live",
    world: "Worlds 1 & 2",
    blurb: "",
    tone: "text-moss border-moss/40 bg-moss/10",
  },
  planned: {
    label: "Planned",
    world: "Not started",
    blurb: "",
    tone: "text-text-secondary border-stone-600 bg-stone-700/30",
  },
};

export const stageOrder: RoadmapStage[] = ["dev", "beta", "live", "planned"];

export const areaLabels: Record<RoadmapArea, string> = {
  gameplay: "Gameplay",
  client: "Client & graphics",
  world: "World & content",
  economy: "Economy",
  community: "Community & site",
  tools: "Tools",
};

export const roadmapItems: RoadmapItem[] = [
  // DEVELOPMENT (World 4)
  {
    id: "farming",
    title: "Farming",
    stage: "dev",
    area: "gameplay",
    summary: "Allotment, flower and herb patches.",
    highlights: [
      "25 crops, from potatoes to snape grass, marigolds to white lilies, guam to torstol",
      "Disease, compost and watering, with crops growing while you are logged out",
      "Tool leprechauns at every site, and Master Farmers to pickpocket for seeds",
    ],
    remaining: ["Fruit trees, hops and the rest of the patches"],
  },
  {
    id: "construction",
    title: "Construction",
    stage: "dev",
    area: "gameplay",
    summary:
      "Buy a house, build its rooms and furnish them, and show your house to other players.",
    highlights: [
      "Estate agent in Varrock to buy a house",
      "Yanille, Rimmington and Brimhaven portals",
      "Basic construction system",
    ],
    remaining: ["Lots"],
  },
  {
    id: "collection-log",
    title: "Collection log",
    stage: "dev",
    area: "client",
    summary:
      "Every collectible item you have received, and where it came from, shown over the game without stopping play.",
  },
  {
    id: "hiscore-records",
    title: "Hiscore records and collection log leaderboard",
    stage: "dev",
    area: "community",
    summary:
      "Two hiscore tabs: who reached 99 and 200 million experience in each skill, and who has completed the most of the collection log.",
  },
  {
    id: "skill-capes",
    title: "Capes of accomplishment",
    stage: "dev",
    area: "gameplay",
    summary: "Skill, achievement, quest, maxing and completionist capes.",
    image: {
      src: "/roadmap/skill-capes.png",
      alt: "Skill capes",
      width: 250,
      height: 250,
    },
    remaining: ["Integrating their respective stats, emotes and NPCs"],
  },
  {
    id: "wiki",
    title: "Custom wiki",
    stage: "dev",
    area: "community",
    summary:
      "A data-driven wiki of every item, monster and shop, directly editable in the browser.",
  },
  {
    id: "world-update",
    title: "World update",
    stage: "dev",
    area: "client",
    summary:
      "A reimagining of the world map with modernised environments, rebuilt cities and redesigned regions. The goal is to preserve the spirit of RSC while delivering a world that feels closer to OSRS in scale, detail and atmosphere.",
  },

  // BETA (World 3)
  {
    id: "evil-tree",
    title: "Global activity – Evil tree",
    stage: "beta",
    area: "world",
    summary:
      "A strange sapling sprouts near Lumbridge every two hours or so, and everyone who gathers round it brings the tree down together.",
    highlights: [
      "A sprout, a sapling and a young tree, nursed into an evil tree in three minutes",
      "Half an hour to fell it, and up to 25,000 points for chopping and burning",
      "Four roots that stun whoever works their side for four to six seconds",
      "Kindling to set alight against it, and a face that lunges at whoever stands before it",
      "A leprechaun’s reward of Woodcutting and Firemaking experience and noted logs",
    ],
    remaining: [
      "Two trees a day each, and cutting roots alone counts as one",
      "Only the normal tree so far: machetes, Farming and other kinds are not in yet",
      "Its skin is an early one and will be polished",
    ],
  },
  {
    id: "tcg",
    title: "Trading card game (TCG)",
    stage: "beta",
    area: "gameplay",
    summary:
      "A 742-card game played while you play, with packs, foils and trading between players.",
    highlights: [
      "548 item cards and 194 monster cards, each painted from its own sprite or model",
      "Credits from skilling and kills, and 16 booster packs from 2,000 to 6,800 credits",
      "Seven rarities, grades S to E, foils and a god pack in every thousand packs",
      "A panel for the collection, the shop and trades of up to 100 cards",
    ],
    remaining: [
      "Cards are for fun: they have no value in or out of the game",
    ],
  },
  {
    id: "bank-rework",
    title: "Bank rework",
    stage: "beta",
    area: "client",
    summary:
      "The bank rebuilt to Old School’s shape: tabs, a scrolling grid, withdrawals as notes and placeholders.",
    image: {
      src: "/roadmap/bank-tabs.png",
      alt: "Bank tabs",
      width: 781,
      height: 489,
    },
    highlights: [
      "All first, then up to nine tabs of your own, each shown by its first item",
      "Withdraw as notes: 892 note twins, a stack to a slot and no size limit",
      "Placeholders keep an emptied item’s slot, and the padlock clears them",
      "A bank on Lumbridge Castle’s upper floor and a deposit box on the Karamja dock",
    ],
    remaining: [
      "The classic interface’s bank still turns pages and has no tabs",
    ],
  },
  {
    id: "day-night",
    title: "Day and night",
    stage: "beta",
    area: "client",
    summary:
      "The world keeps its own clock: a whole day in an hour, a sun that crosses the sky and a moon that keeps its phase.",
    highlights: [
      "The clock is the world’s, so everyone on it shares the light",
      "The sun rising in the south-east and setting in the north-west, the sky reddening towards sunset",
      "The moon showing its phase, the stars, the Milky Way and the odd shooting star",
      "Night brightness and Stars settings, with Day, Dusk, Night and Classic retained",
    ],
    remaining: [
      "The sun and the stars need HD graphics with Enhanced lighting",
    ],
  },
  {
    id: "weather",
    title: "Dynamic weather system and seasons",
    stage: "beta",
    area: "client",
    summary:
      "Rain, cloud and storms that everyone shares, with snow, deep snow and ice in winter.",
    highlights: [
      "Clear skies, cloud, rain and storms, or a fixed setting of Off, Rain, Storm, Snow or Blizzard",
      "Blizzard: a gale, a white-out and snow piling three times as fast",
      "Winter snow on fields, roofs and treetops, deep snow and frozen lakes and fountains",
      "A drifting cloud layer whose shadows pass over the ground and reflect in the water",
    ],
  },
  {
    id: "gathering",
    title: "Automated gathering",
    stage: "beta",
    area: "gameplay",
    summary:
      "One click keeps Woodcutting, Mining, Fishing and Thieving going until something ends it.",
    highlights: [
      "Each skill keeps its own cadence: three ticks per swing, two for a stall and one for a lock",
    ],
  },
  {
    id: "skilling-animations",
    title: "Work animations",
    stage: "beta",
    area: "client",
    summary:
      "Custom work animations across multiple skills, making skilling actions feel more immersive and responsive.",
    image: {
      src: "/roadmap/mining-animation.gif",
      alt: "Mining animation",
      width: 250,
      height: 250,
    },
    highlights: ["Woodcutting, Mining, Firemaking, Fishing and Cooking"],
    remaining: [
      "Thieving",
      "Runecraft",
      "Hunter",
      "Construction",
      "Fletching",
      "Agility",
      "Prayer",
      "Herblaw",
      "Crafting",
      "Smithing",
      "A few Magic spells, e.g. High level alchemy",
      "Farming",
      "Slayer",
    ],
  },
  {
    id: "hd-graphics",
    title: "HD graphics",
    stage: "beta",
    area: "client",
    summary:
      "A GPU renderer with lit scenery, photo ground, reflections, weather and seasons.",
    image: {
      src: "/roadmap/hd-graphics.png",
      alt: "HD graphics",
      width: 781,
      height: 489,
    },
    highlights: [
      "Enhanced lighting with bloom and tone mapping",
      "Photo ground at 512, 1024, 2048 or 4096, blended across tiles",
      "Photo materials on scenery and floors, and a fabric weave on the stall cloth",
      "Reflective water, swaying trees, winter snow and ice, autumn leaves",
      "Fifteen more effect switches, from particles and mist to vignette and film grain",
      "Parchment dialogues, option menus and level-ups",
    ],
    remaining: [
      "A browser without WebGL 2 falls back to the classic view and boxes",
    ],
  },
  {
    id: "travel-maps",
    title: "Travel maps",
    stage: "beta",
    area: "client",
    summary:
      "Travel destinations on an interactive map, with fares beneath each location and your current position highlighted.",
    highlights: [
      "Click a destination or use its number key to instantly zoom the map",
      "Travel Maps is enabled by default",
      "Crandor Isle appears while Dragon Slayer is in progress",
    ],
    remaining: [
      "When disabled, the interface reverts to the traditional destination list",
    ],
  },
  {
    id: "profile-page",
    title: "Time played and the Profile page",
    stage: "beta",
    area: "client",
    summary:
      "A Profile page on the quests tab, after Old School’s character summary, with time played tracked on every world.",
    highlights: [
      "Combat and total level, total experience, quests, quest points, diary tasks and time played",
      "The quest and diary boxes on it open their pages",
      "The tab’s stone shows the open page’s icon, the compass for the Profile page",
    ],
    remaining: ["Every account starts counting time played from this update"],
  },
  {
    id: "interface-updates",
    title: "Prayers, spellbook and XP drops",
    stage: "beta",
    area: "client",
    summary:
      "Prayers and spells as grids of Old School’s icons with filters, and XP drops configured RuneLite-style.",
    highlights: [
      "Prayers five across, with Old School’s glow and greyed pictures, and a Filters button",
      "48 spells, seven across, with the runes you have against the runes a spell needs",
      "XP drops in three positions and three sizes, an eight-colour palette, counters and a progress bar",
      "A switch for every skill under XP drops, Construction included",
      "Items in the inventory can be dragged about to rearrange them",
    ],
  },
  {
    id: "plugins",
    title: "Plugins and Discord Rich Presence",
    stage: "beta",
    area: "client",
    summary:
      "A RuneLite-style plugin system, with nine plugins and a Discord card that shows what you are doing.",
    image: {
      src: "/roadmap/discord-rich-presence.png",
      alt: "Plugins and Discord Rich Presence",
      width: 250,
      height: 250,
    },
    highlights: [
      "Storage Interactions, Expanded Bank, Option Hotkeys and Travel Maps",
      "Status Bars, Resource Packs and Interface Layout, with an editor and Compact Orbs presets",
      "Discord Rich Presence that never names the Wilderness",
      "TCG: panel, pack opening and your cards",
    ],
  },
  {
    id: "scenery",
    title: "New scenery and interfaces",
    stage: "beta",
    area: "world",
    summary: "Things the world was missing, or that needed an update.",
    highlights: [
      "Bank booths and deposit boxes",
      "Portraits and poll booths",
      "Evergreen, oak, willow, maple, yew and magic trees",
      "Welcome screen with the message of the week",
    ],
  },
  {
    id: "random-event",
    title: "Random events",
    stage: "beta",
    area: "world",
    summary: "Animated random-event NPCs that turn up while you train.",
    highlights: ["Mining, Woodcutting, Fishing and Prayer"],
  },
  {
    id: "ironman",
    title: "Ironman mode",
    stage: "beta",
    area: "gameplay",
    summary: "Tempered Iron: play on your own, with a helm that shows it.",
    highlights: [
      "Chosen at registration or from Paul in Lumbridge",
      "No trading, staking or Tradepost; private shop stock",
      "Ironman armour and a hiscores filter",
    ],
    remaining: ["Hardcore and Ultimate variants"],
  },
  {
    id: "diaries",
    title: "Achievement diaries",
    stage: "beta",
    area: "gameplay",
    summary: "Four diaries in Old School’s style, with rewards.",
    highlights: ["Shown on the hiscores panel with quest points"],
  },
  {
    id: "orthographic-camera",
    title: "Orthographic camera mode",
    stage: "beta",
    area: "client",
    summary:
      "A parallel-projection view mode that presents the world in a clean, classic isometric perspective.",
    highlights: [
      "In the options tab and under Performance in the settings tab",
      "Off by default, and working in classic and HD graphics alike",
      "Field of view is its zoom, since a parallel view has one scale",
    ],
  },
  {
    id: "npc-improvements",
    title: "NPC multi-chat and pass-through",
    stage: "beta",
    area: "gameplay",
    summary:
      "NPCs can converse with several players at once and no longer trap players in tight corridors.",
  },
  {
    id: "account-page",
    title: "Account hub and play-anywhere logins",
    stage: "beta",
    area: "community",
    summary:
      "Every world’s character in one place, with a first login on any world creating the character for you.",
    highlights: [
      "Overview, Character, Worlds, Security and Linked accounts",
      "A new password checked as it is typed and applied on every world",
      "A player’s first login on Worlds 2, 3 or 4 needs no prior website login",
    ],
    remaining: [
      "A different password for a character that a world already has is still refused",
    ],
  },

  // LIVE (Worlds 1 & 2)
  {
    id: "tradepost",
    title: "Tradepost",
    stage: "live",
    area: "economy",
    summary:
      "Player-driven market with price history, per-world markets and a public API.",
    image: {
      src: "/roadmap/tradepost.png",
      alt: "Tradepost",
      width: 781,
      height: 489,
    },
  },
  {
    id: "equipment",
    title: "Worn equipment tab",
    stage: "live",
    area: "gameplay",
    summary:
      "Eleven slots with bonuses and an ammo slot, keeping RSC’s equip rules.",
    image: {
      src: "/roadmap/worn-equipment-tab.png",
      alt: "Worn equipment",
      width: 781,
      height: 489,
    },
  },
  {
    id: "interface",
    title: "Client interface rework",
    stage: "live",
    area: "client",
    summary: "Fixed, resizable and classic layouts.",
  },
  {
    id: "launcher",
    title: "Standalone launcher",
    stage: "live",
    area: "client",
    summary:
      "A desktop client that updates itself, with an opt-in switch for the beta world.",
  },
  {
    id: "themes",
    title: "Seasonal login themes",
    stage: "live",
    area: "client",
    summary:
      "Stone Hall, Halloween, Christmas and Easter scenes that follow the calendar.",
  },
  {
    id: "black-hole",
    title: "Black Hole (player punishment system)",
    stage: "live",
    area: "world",
    summary:
      "The historic realm for mischievous players, accessible through the Disk of Returning.",
  },
  {
    id: "hiscores",
    title: "Hiscores, avatars and world map",
    stage: "live",
    area: "community",
    summary:
      "All skills ranked, character portraits and the interactive world map.",
  },
  {
    id: "trackers",
    title: "Loot and XP trackers",
    stage: "live",
    area: "client",
    summary: "Track drops and set experience goals from the client.",
  },

  // PLANNED (not started)
  {
    id: "cape-emotes",
    title: "Skill cape emotes",
    stage: "planned",
    area: "gameplay",
    summary: "An animation that plays while wearing a cape of accomplishment.",
  },
  {
    id: "clans",
    title: "Clan system",
    stage: "planned",
    area: "community",
    summary:
      "A clan is an organised group of players who participate together in group activities such as player killing, training skills, boss killing, minigames or simply existing as a community of friends. Clans in Old School RuneScape have access to a number of clan-specific features.",
  },
  {
    id: "hc-ironman",
    title: "Hardcore and Ultimate Ironman",
    stage: "planned",
    area: "gameplay",
    summary: "The badges are reserved. The rules are not built.",
  },
  {
    id: "wieldable-tools",
    title: "Wieldable skilling tools",
    stage: "planned",
    area: "gameplay",
    summary:
      "Equip pickaxes and woodcutting axes in the weapon slot to save inventory space while gathering.",
  },
  {
    id: "polling",
    title: "Polling system",
    stage: "planned",
    area: "community",
    summary:
      "Poll booths in the world and voting on the website to guide game changes.",
  },
  {
    id: "anti-macro",
    title: "Anti-macro and botting mitigation",
    stage: "planned",
    area: "tools",
    summary:
      "Detection systems and server heuristics to prevent automation and protect the economy.",
  },
  {
    id: "i18n",
    title: "Multi-language client support (i18n)",
    stage: "planned",
    area: "client",
    summary:
      "Localisation framework supporting multiple languages across menus, dialogues and interface text.",
  },
  {
    id: "agility-shortcuts",
    title: "Agility shortcuts and 3D obstacles",
    stage: "planned",
    area: "world",
    summary:
      "New 3D interactive obstacle models, fence vaults and map shortcuts across RuneScape.",
  },
  {
    id: "seasonal-events",
    title: "In-game seasonal events",
    stage: "planned",
    area: "world",
    summary:
      "Seasonal holiday events, festive world transformations and unique event items for Halloween, Christmas and Easter.",
  },
  {
    id: "runecraft",
    title: "Skill: Runecraft",
    stage: "planned",
    area: "gameplay",
    summary:
      "Craft runes directly from essence at mysterious elemental altars.",
  },
  {
    id: "slayer",
    title: "Skill: Slayer",
    stage: "planned",
    area: "gameplay",
    summary:
      "Assignments from Slayer Masters to hunt unique monsters and unlock new Slayer gear and dungeons.",
  },
  {
    id: "hunter",
    title: "Skill: Hunter",
    stage: "planned",
    area: "gameplay",
    summary: "Track, trap and capture wild creatures across diverse habitats.",
  },
  {
    id: "exploration",
    title: "Skill: Exploration",
    stage: "planned",
    area: "gameplay",
    summary:
      "A new skill for charting forgotten islands, underground caverns and ruins on expeditions.",
  },
];
