export type BetaTest = { text: string; careful?: boolean };

export type BetaArea = { title: string; careful?: boolean; items: BetaTest[] };

export const betaRevision = "2026.11.18-2ad8ee658adb";

export const betaAreas: BetaArea[] = [
  {
    title: "Logging in and New Characters",
    items: [
      {
        text: "New login screen (frameless with divider below logo) authenticates successfully; title theme plays; World button displays world star icon.",
      },
      {
        text: "Upon login, Old School welcome screen displays in both Fixed and Resizable modes.",
      },
      {
        text: "**New character** initializes on **Tutorial Island**: Character Creator (drag-to-rotate preview), followed by Gielinor Guide.",
      },
      {
        text: "**Game Mode Selection** interface: all tiers (Normal, Hard, Extreme, Realism) and paths (Gatherer, Artisan, Skiller, Noble) are selectable; Noble path is restricted to Extreme and Realism tiers.",
      },
      {
        text: "All instructor stages function correctly: fishing, cooking, baking, quests, mining, smithing, melee, ranged, banking, prayer, and magic. Each door opens only upon completion of its prerequisite stage, guides character through, and closes automatically.",
      },
      {
        text: "Rats in training pen are level 3. Death on Tutorial Island incurs no item loss and respawns character beside current instructor.",
      },
      {
        text: "Tutorial departure vessel: travel map provides navigation options to Lumbridge and Varrock east docks, transporting player accurately.",
      },
      {
        text: '"Skip Tutorial Island" dialogue option functions correctly for veteran accounts.',
      },
      {
        text: "**Existing character** logging in resumes at previous logout coordinates and never spawns on Tutorial Island.",
      },
      {
        text: "Secondary Gielinor Guide in Lumbridge facilitates mode adjustments: tier changes permit transitions only to faster rates (with experience converted), and path changes allow any valid path for active tier.",
      },
      {
        text: "Tier and path icons display preceding player names in public chat, private messages, and staff list; Game Modes plugin settings modify display preferences accordingly.",
      },
    ],
  },
  {
    title: "Accounts, Quests and Saved Progress",
    careful: true,
    items: [
      {
        text: '**Quests disabled:** quest tab displays "No quests yet"; quest points reflect 0 following initial login; quest NPCs have no dialogue.',
      },
      {
        text: "Quest-locked content remains accessible: Herblaw without Druidic Ritual, Champions' Guild, Doric's anvils, Lumbridge cook's range, Ardougne and Watchtower teleports, Iban Blast, along with quest doors and gates.",
      },
      {
        text: "Logging out and reconnecting preserves all state: skills, bank, inventory, equipment, farming patches, rune pouches, and game mode.",
      },
      {
        text: "Reloading client webpage mid-session (resumed session) restores character to exact previous coordinates and state.",
      },
    ],
  },
  {
    title: "Bank",
    careful: true,
    items: [
      {
        text: "Old School bank interface: tabs aligned across top edge, drag-and-drop item transfer between tabs, tab renaming, and tab collapse functionality.",
      },
      {
        text: "Placeholders (padlock toggle): withdrawing final item from stack creates placeholder slot; toggle state persists across sessions.",
      },
      {
        text: "Note toggle withdraws banknotes exclusively when enabled; banknotes match Old School appearance and stack identically to currency.",
      },
      {
        text: "Custom item arrangement is preserved indefinitely (no automatic sort button).",
      },
      {
        text: "Search input appears only during active search queries; empty slots display with no placeholder or visual artifact.",
      },
      {
        text: "Custom items (capes, farming tools, runes, pouches, vote tokens, dragon axe) deposit and withdraw with accurate quantities.",
      },
      {
        text: "Bank booths and bank deposit boxes function properly across all regions, including Lumbridge Castle upper-floor branch.",
      },
      {
        text: "Duplication verification: rapidly drop and collect non-stackable items, initiate trades, and bank inventory; item quantities remain consistent with no duplication.",
      },
      {
        text: "**New: 192 bank slots.** The modern bank's title shows slots used of the bank's size (e.g. `21/192 items`); the classic bank keeps its four page buttons; a bank filled past 100 items opens with every item and count intact.",
      },
    ],
  },
  {
    title: "Farming",
    items: [
      {
        text: "Falador, Catherby, and Ardougne agricultural patches: allotments, flowers, herbs, bushes, trees, fruit trees, and hops.",
      },
      {
        text: "Farming implements (rake, seed dibber, spade, trowel, secateurs, watering can): each exhibits unique animation and renders visibly in character hands.",
      },
      {
        text: "Core crop lifecycle: planting, watering, applying compost (reduces disease probability, increases yield), curing disease, clearing dead crops, and harvesting.",
      },
      {
        text: "Farming patch states are instanced per player across shared physical patch locations.",
      },
      {
        text: "Crop growth progresses offline; patch states and timers persist accurately across sessions.",
      },
      {
        text: "Arboriculture: fill plant pots from weeded farming patches, cultivate seedlings into mature saplings, and transplant into designated tree patches.",
      },
      {
        text: "Tool leprechauns securely store farming tools and exchange harvested crops for banknotes.",
      },
      {
        text: "Pickpocketing Master Farmers (Thieving level 38) yields assorted seeds; standard farmers occasionally yield potato seeds.",
      },
      {
        text: "Scarecrow assembly (sack combined with hay bale) functions correctly and allows placement in flower patches.",
      },
      {
        text: "Experience distribution conforms to Old School rates (planting, health verification, and harvesting); Farming ranks display on hiscores.",
      },
      {
        text: "Visual fidelity: HD mode renders stone borders, tilled soil, and lush grass; Classic mode maintains low-profile garden beds with clear visibility.",
      },
    ],
  },
  {
    title: "Runecraft",
    items: [
      {
        text: "Aubury, Wizard Cromperty, Head Wizard, Brimstail, and Traiborn provide teleportation to rune essence mine; Aubury awards air talisman upon initial visit.",
      },
      {
        text: "Rune essence is extractable; pure essence extraction requires Mining level 30.",
      },
      {
        text: "Elemental and catalytic ruins (air, mind, water, earth, fire, body, cosmic, chaos, nature, law) permit entry via corresponding talisman, tiara, or Runecraft cape.",
      },
      {
        text: "Altar crafting yields correct multiplier quantities and experience values per level; binding visual effect renders properly in Classic and HD modes.",
      },
      {
        text: "Exit portals operate reliably without player obstruction within altar chambers.",
      },
      {
        text: "Talismans feature functional _Locate_ navigation and drop appropriately from monster drop tables.",
      },
      {
        text: "Tiara forging requires Crafting level 23, silver bar, and tiara mould at altar; Dommik and Rommik retail moulds, and Dommik shop interface functions correctly.",
      },
      {
        text: "Combination runes (mist, dust, mud, smoke, steam, lava): 50% failure rate applies without binding necklace (Enchant Level 2 on emerald necklace, 16 charges); Magic spellbook recognizes combination runes as both constituent elements.",
      },
      {
        text: "**Abyss:** Mage of Zamorak (Wilderness north of Edgeville) applies skull status and drains prayer points; six surrounding obstacles require respective skills or tools; 11 dimensional rifts route to corresponding altars, including death altar (Runecraft level 65).",
        careful: true,
      },
      {
        text: "**Essence pouches:** Abyssal creatures drop pouches in sequential size tiers; fill and empty actions operate properly; contents persist through logout; degraded pouches can be repaired by Dark Mage; pouches remain non-tradable.",
        careful: true,
      },
      {
        text: "Ourania Altar (ladder at coordinates 702, 649): transmutes pure essence into random runes with 1.7x experience multiplier.",
      },
      {
        text: "Port Sarim ↔ Entrana sea transit operates correctly, prohibiting restricted weapons and combat armour.",
      },
      {
        text: "Rune vendor shops maintain stock capacity of 5 per rune type, replenishing 1 unit every 10 seconds.",
      },
      {
        text: "Runecraft metrics display accurately across hiscores, skill guide, and wiki documentation.",
      },
    ],
  },
  {
    title: "Gathering and Production Skills",
    items: [
      {
        text: "**Woodcutting:** tree-chopping animation displays with leaning trunk effect; axe tiers (bronze through dragon) reflect in skill guide; dragon axe provides optimal chopping speed.",
      },
      {
        text: "**Mining:** pickaxe excavation animation plays properly; pickaxes can be equipped (Attack level requirements apply from steel upwards), sheathe at hip, and sway in sync with character walk cycle.",
      },
      {
        text: "**Fishing:** small net, fishing rod, harpoon, and lobster pot feature dedicated animations; big net collects appropriate fish species.",
      },
      {
        text: "**Firemaking:** all log varieties are combustible; tinderbox ignites logs directly within inventory; ground logs trigger automated ignition attempts until lit.",
      },
      {
        text: '**Cooking:** kneeling animation plays at campfires; "How many would you like to cook?" prompt functions properly; single-item cooking executes seamlessly.',
      },
      {
        text: "**Smelting** processes ores into metal bars (bronze, iron, silver, gold) at designated furnaces.",
      },
      {
        text: "Pickpocketing automated queue functions without requiring per-tick input; failed attempts trigger NPC alerts without engaging combat.",
      },
      {
        text: "Path-specific game mode perks activate reliably (double yields, direct bank deposits, reduced burn rates).",
      },
    ],
  },
  {
    title: "Run Energy (Fatigue Removed)",
    items: [
      {
        text: 'Fatigue is gone: training never says "too tired", and there is no sleeping or sleep word.',
      },
      {
        text: "The run orb beside the minimap shows run energy and toggles running; a runner moves two tiles per tick and energy drains while running.",
      },
      {
        text: "Energy recovers while walking or standing, faster at higher Agility; running stops at 0% energy.",
      },
      {
        text: "Run energy and the run toggle persist across logout and relog.",
      },
      {
        text: "Running uses the Old School run animation, viewed from every angle (side, corners, toward and away from the camera), in Classic and HD modes.",
      },
      {
        text: "Status Bars and the Classic Hits / Prayer stack display a run energy bar in place of fatigue; `::stats` lists run energy.",
      },
      {
        text: "Claimed achievement diary tiers (the seasoned perk) slow the run energy drain.",
      },
    ],
  },
  {
    title: "The Idler's Yard (AFK Skilling)",
    careful: true,
    items: [
      {
        text: "`::afk` teleports to the yard's gate (walled district east of Varrock East Square); the yard plays Lullaby and is named on the world map.",
      },
      {
        text: "The **AFK Master** sells training time for vote tokens (6 hours per token, up to 24 hours held), both via dialogue and by using a token on him.",
      },
      {
        text: "Clicking a training spot once trains continuously with no tools or supplies: woodcutting, mining, fishing, firemaking, cooking, smithing and crafting everywhere; fletching, herblaw, thieving, agility, farming and runecraft on members' worlds.",
      },
      {
        text: "Each spot plays its own Old School animation (anvil hammering, seated spinning, fletching with knife and logs, potion mixing, stall thieving, harpooning, runecraft bind glow) with sounds on the matching frames.",
      },
      {
        text: "The agility log: the character walks it end to end, steps off, turns and walks back (Old School balance walk in HD).",
      },
      {
        text: "The yard's steps are walked, not teleported; left-click is Ascend from below and Descend from above.",
      },
      {
        text: "The top-of-screen panel shows remaining time and session earnings; experience (10,000–55,000 per hour by level, times the game mode multiplier) and about 1,000 AFK tokens per hour are awarded.",
      },
      {
        text: "AFK training brings no random events and no diary, collection log or perk credit; when time runs out, training stops.",
      },
      {
        text: "Logging out mid-training and back in on the same tile within 5 minutes resumes training automatically.",
      },
      {
        text: "The AFK Master's **Trade** shop sells Idler's (lilac) and Daydreamer's (teal) outfits for AFK tokens: prices are shown in tokens, tokens are deducted exactly, the shop buys nothing back, and the outfits and tokens cannot be traded.",
      },
    ],
  },
  {
    title: "Combat",
    careful: true,
    items: [
      {
        text: "Combat experience calculates proportionally from damage dealt upon each successful strike.",
      },
      {
        text: "Ranged combat: weapon speeds and attack styles apply accurately; darts and throwable knives stack properly; point-blank shooting functions without forced movement.",
      },
      {
        text: "Magic: spells award standard Old School base experience; autocast functions as intended; combat teleportation executes successfully.",
      },
      {
        text: "Consuming food during combat incurs standard 3-tick attack delay.",
      },
      {
        text: "Wilderness skull indicator conforms to Old School visuals; King Black Dragon lair entrance levers operate correctly.",
      },
      {
        text: "Count Draynor remains engaged throughout combat and awards appropriate experience upon defeat.",
      },
      {
        text: "Casting spells or discharging arrows maintains stable connection without client or server disconnection.",
      },
      {
        text: "Bandos, Rime, and Cinder armour sets equip properly with correct character model appearance.",
      },
    ],
  },
  {
    title: "Capes and Equipment",
    items: [
      {
        text: "Skill capes awarded at level 99 across all skills, alongside quest point, music, achievement diary, max, and completionist capes; equipped capes render correctly during locomotion.",
      },
      {
        text: "Dragon axe (item ID 2510) and dragon battleaxe (item ID 594) exist as distinct items with proper nomenclature and item parameters.",
      },
      {
        text: "Axe weapons swing blade-first in combat; equipped tools animate in sync with character walk cycle.",
      },
    ],
  },
  {
    title: "World and Travel",
    items: [
      {
        text: "Redesigned settlements (Al-Kharid, Draynor, Falador): comprehensive collision navigation, building access, and door interactions.",
      },
      {
        text: "Barbarian Village (Old School layout): structural walls, roof geometry, and animated clan standard.",
      },
      {
        text: "Kharidian Desert expanse south of Shantay Pass loads terrain and environment parameters correctly.",
      },
      {
        text: "Solmara transit: Solmara Explorer vessel moored at Varrock east pier provides bidirectional passage to Thorndale.",
      },
      {
        text: "Animated environmental assets: flags, merchant signage, grandfather clocks, laundry lines, magical portals, fireplaces, street lamps, and swamp bubbles.",
      },
      {
        text: "High-density regions (Varrock, Falador, Abyss) render all environment models without clipping or asset culling failures.",
      },
      {
        text: "Collision boundaries (walls, fences, railings) impede movement with zero unintended pass-through tiles.",
      },
      {
        text: "Nautical travel charts and interface maps display and route correctly.",
      },
      {
        text: "The world map names Solmara's kingdom, regions, capital, towns, landmarks and islets, and its 12 dungeons on the dungeon level.",
      },
      {
        text: "NPCs face their placed direction when they appear and after respawning.",
      },
      {
        text: "Roofs on sloping ground rest on their walls (no floating downhill edge, e.g. Solmara's hillsides); raised or sunk scenery stands at the right height in Classic and HD.",
      },
      {
        text: 'Doors and wall objects that go out of view and come back never leave "undefined" lines in the right-click menu.',
      },
      {
        text: '`::teleport` onto your own tile leaves you free to act (no "You are busy" lock).',
      },
    ],
  },
  {
    title: "Events and Economy",
    items: [
      {
        text: "**Evil Tree:** spawns at approximately two-hour intervals, permits woodcutting and firemaking interactions, retaliates during combat, and tracks progress via heads-up display.",
      },
      {
        text: "**Well of Goodwill:** accepts currency and item contributions; reaching 50M activates 60-minute 1.5x global experience boost; major contributions broadcast world-wide announcements.",
      },
      {
        text: "**Voting system:** `::vote` command launches external ballot page with player account parameter; `::claim` awards 250,000 coins and one Vote token per verified vote (depositing directly into bank if inventory is full); rate limit enforced at one vote daily per account and IP address.",
        careful: true,
      },
      {
        text: "**Community polls:** polling booths open voting interface; maximum one ballot per account (capped at three per IP address); eligibility requires minimum 5 hours of playtime and total level 100; vote tallies remain hidden until poll closure.",
        careful: true,
      },
      {
        text: "Newsletter stand _Read_ interaction opens published newsletter publications.",
      },
      {
        text: "Tradepost / Grand Exchange marketplace: creation of buy and sell orders, offer cancellation, and item collection.",
        careful: true,
      },
      {
        text: "Old School store interface: bulk purchase and sale quantities (1, 5, 10, X).",
      },
      {
        text: "Trading Card Game (TCG): card backs render, card set albums display, and booster packs unpack properly.",
      },
    ],
  },
  {
    title: "Interface",
    items: [
      {
        text: "Dialogue progression: NPC conversations pause awaiting pointer click or Spacebar input (Classic and mobile layouts preserve legacy pacing).",
      },
      { text: "Dialogue interfaces anchor within chatbox frame in HD mode." },
      {
        text: "Chat rendering utilizes Old School typography; chat history scrolls smoothly.",
      },
      {
        text: "Stretched scaling modes (125%, 150%, 200%) function across resizable layouts.",
      },
      {
        text: "Interface Layout customization: edit mode, layout presets, component visibility toggles, and widget grouping.",
      },
      {
        text: "Resource Packs: pack installation, dynamic pack swapping, and restoration of default assets.",
      },
      { text: "Experience drops: configuration options within Settings tab." },
      {
        text: 'Skill compendiums for all skills (Stats tab) and dedicated "Relics of Return" guidebook.',
      },
      {
        text: "**Skill Icons** option (Relics of Return plugin): Relics of Return (default), RSC or OSRS icons apply to the stats tab, skill guides and XP drops; the redrawn Relics of Return set includes a Construction icon.",
      },
      {
        text: "The Resizable layout's side panel is solid: the 3D world never shows through it as dark shapes in the inventory.",
      },
      {
        text: "Music system: 876 tracks unlocked via territorial exploration; Area, Shuffle, and Single playback modes; volume and playback settings persist across sessions.",
      },
      {
        text: "Prayer, Magic, and Quest tabs patterned after Old School interfaces; status display bars; personal records integrated into hiscores.",
      },
      {
        text: "Inventory drag-and-drop item repositioning functions accurately.",
      },
      {
        text: "Orthographic camera view toggles on and off without perspective distortion.",
      },
    ],
  },
  {
    title: "HD Graphics",
    items: [
      {
        text: "Day and night cycles: dynamic skybox rendering, nocturnal light emissions, and lunar phase transitions.",
      },
      {
        text: "Weather systems: precipitation (rain, snow, blizzards), atmospheric mist, and cloud cover without ground texture waterlogging.",
      },
      {
        text: "Seasonal cycles: winter snowfall with frozen waterways, and autumn foliage transitions.",
      },
      {
        text: "Flora enhancements: detailed bark textures, increased tree heights, visible root geometry, and leaning willow tree models.",
      },
      {
        text: "Timber and wooden scenery renders without purple or white visual artifacting; HD rendering remains stable across Windows graphics drivers without unintended fallback to Classic mode.",
      },
      {
        text: "Classic rendering mode functions without line flickering (F1 toggle executes cleanly).",
      },
    ],
  },
  {
    title: "Phones and Tablets",
    items: [
      {
        text: "Vertical orientation: Portrait 2 configured as default; mobile Old School layout applies.",
      },
      {
        text: "Landscape orientation: translucent chat overlay; Equipment tab bottom row displays completely.",
      },
      {
        text: "Chat text input functions reliably across all mobile layout configurations.",
      },
      {
        text: "Battery status and network signal indicators display; Classic layout toggle operates as intended.",
      },
      {
        text: "Tablet devices automatically initialize resizable interface layout upon login.",
      },
      {
        text: "Frame rate on mid-tier mobile hardware maintains smooth performance across high-density settlements.",
      },
    ],
  },
  {
    title: "Launcher",
    items: [
      {
        text: 'When "Join the beta" option is enabled, World 3 displays designated Beta badge and boots beta client.',
      },
      {
        text: "World hopping between World 3 and World 1 (via World Hopper or title screen) seamlessly transitions between live and beta clients in both directions.",
      },
      {
        text: "Discord Rich Presence accurately broadcasts active Farming and Runecraft activities.",
      },
    ],
  },
];
