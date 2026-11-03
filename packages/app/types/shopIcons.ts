// Shop item icons from game-icons.net (CC BY 3.0, by Lorc, Delapouite & contributors).
// An item without a chosen icon gets a best guess from its name; the DM can pick any other.

/** First match wins — specific phrases before general words */
const RULES: Array<[RegExp, string]> = [
  // Specific phrases that would otherwise hit a general word below
  [/healer'?s kit|first aid/, 'first-aid-kit'],
  [/alteration|mending/, 'sewing-needle'],
  [/crate/, 'wooden-crate'],
  [/bookends/, 'stone-block'],
  [/greatcoat|\bcoat\b/, 'pirate-coat'],
  [/\bring\b/, 'diamond-ring'],
  [/gemstone/, 'gems'],
  [/trinket|curio/, 'jigsaw-box'],
  // Potions, poisons, alchemy
  [/healing|heal/, 'health-potion'],
  [/mind reading/, 'magic-potion'],
  [/heroism/, 'round-potion'],
  [/water breathing/, 'bubbling-flask'],
  [/potion/, 'standing-potion'],
  [/antitoxin|smelling salts/, 'vial'],
  [/poison|toxin|truth serum|sleep draught/, 'poison-bottle'],
  [/acid/, 'fizzing-flask'],
  [/alchemist'?s fire/, 'fire-bottle'],
  [/alchemist/, 'round-bottom-flask'],
  [/flash powder/, 'powder'],
  [/dust/, 'dust-cloud'],
  [/bomb/, 'fire-bomb'],
  [/salve|balm|ointment/, 'cloth-jar'],
  [/perfume|scent(?!ed candle)/, 'perfume-bottle'],
  [/ley-?salt|salt/, 'crystal-cluster'],
  // Drink and food
  [/drinking contest/, 'beer-stein'],
  [/\bale\b|beer|drink on the house/, 'beer-stein'],
  [/brandy/, 'brandy-bottle'],
  [/wine/, 'wine-bottle'],
  [/whiskey|whisky|\brum\b|gin\b/, 'beer-bottle'],
  [/cider|coffee/, 'coffee-mug'],
  [/\btea\b/, 'teapot'],
  [/champion'?s cup|trophy/, 'trophy-cup'],
  [/breakfast|supper|meal|stew|dinner|lunch/, 'hot-meal'],
  [/bread/, 'bread'],
  [/\bration/, 'meat'],
  [/feed|fodder/, 'wheat'],
  // Lodging, travel, animals
  [/bath/, 'bathtub'],
  [/bunk|cot\b/, 'bunk-beds'],
  [/room|suite|lodging|bed\b|night/, 'bed'],
  [/stabl/, 'horseshoe'],
  [/mule|donkey/, 'donkey'],
  [/horse|pony/, 'horse-head'],
  [/saddlebag/, 'knapsack'],
  [/saddle/, 'saddle'],
  [/carriage|coach|cart\b|wagon/, 'old-wagon'],
  [/directions/, 'direction-signs'],
  // Packs, containers
  [/explorer'?s pack|backpack/, 'backpack'],
  [/bedroll|sleeping bag/, 'sleeping-bag'],
  [/component pouch/, 'pouch-with-beads'],
  [/pouch|purse/, 'shiny-purse'],
  [/satchel|map case|bandolier/, 'knapsack'],
  [/crate/, 'wooden-crate'],
  [/cabinet|locked/, 'locked-box'],
  [/chest\b/, 'chest'],
  [/waterskin|canteen/, 'water-flask'],
  [/flask/, 'water-flask'],
  // Light
  [/hooded lantern|lantern/, 'lantern-flame'],
  [/candle|taper/, 'candle-flame'],
  [/lamp oil|\boil\b/, 'oil-can'],
  [/torch/, 'torch'],
  [/tinderbox|flint/, 'flint-spark'],
  [/driftglobe|globe/, 'glass-ball'],
  // Writing, maps, books
  [/spellbook|spell book/, 'spell-book'],
  [/spell scroll|scroll/, 'scroll-unfurled'],
  [/journal|guest book|notebook/, 'notebook'],
  [/history|book/, 'open-book'],
  [/sailor'?s chart|chart|map\b|map of|roads of/, 'treasure-map'],
  [/compass/, 'compass'],
  [/navigator/, 'sextant'],
  [/cartographer/, 'treasure-map'],
  [/sealing wax|seal\b/, 'wax-seal'],
  [/\bink\b|\bpen\b|calligraph/, 'quill-ink'],
  [/parchment|paper/, 'scroll-quill'],
  [/notice board/, 'wooden-sign'],
  [/chalk/, 'stone-tablet'],
  [/rubbing/, 'paint-brush'],
  // Tools and kits
  [/herbalism|herb/, 'herbs-bundle'],
  [/climber/, 'mountain-climbing'],
  [/rope/, 'rope-coil'],
  [/crowbar/, 'crowbar'],
  [/jeweler/, 'gem-pendant'],
  [/mason|smith|hammer/, 'claw-hammer'],
  [/sharpen|repair|whetstone|silvering/, 'anvil'],
  [/alteration|tailor|mending/, 'sewing-needle'],
  [/nameplate|engrav/, 'wooden-sign'],
  [/bookends|stone\b/, 'stone-block'],
  [/grave/, 'tombstone'],
  [/lock\b|trickery/, 'padlock'],
  [/key\b/, 'key'],
  // Weapons and armor
  [/sage-marked|rune/, 'rune-sword'],
  [/scimitar|saber|sabre/, 'saber-slash'],
  [/longsword|broadsword|greatsword/, 'broadsword'],
  [/shortsword|sword/, 'gladius'],
  [/dagger|knife/, 'plain-dagger'],
  [/handaxe|hatchet/, 'hatchet'],
  [/axe/, 'battered-axe'],
  [/bolts?\b/, 'arrow-cluster'],
  [/crossbow/, 'crossbow'],
  [/quiver/, 'quiver'],
  [/arrow/, 'arrow-cluster'],
  [/\bbow\b/, 'bow-arrow'],
  [/pistol shot|shot\b|bullet/, 'bullets'],
  [/pistol|musket|gun/, 'pistol-gun'],
  [/shield/, 'round-shield'],
  [/breastplate/, 'breastplate'],
  [/chain mail|mail/, 'chain-mail'],
  [/leather|studded/, 'leather-vest'],
  [/tabard|sash|scarf|silk/, 'rolled-cloth'],
  // Clothes and jewelry
  [/false tracks/, 'boot-prints'],
  [/boot/, 'leather-boot'],
  [/greatcoat|coat/, 'pirate-coat'],
  [/cloak/, 'cloak'],
  [/robe/, 'robe'],
  [/clothes|outfit|costume|garb/, 'clothes'],
  [/earring/, 'earrings'],
  [/necklace|pendant|amulet/, 'necklace'],
  [/betrothal|band\b|ring\b|signet/, 'diamond-ring'],
  [/pearl/, 'oyster-pearl'],
  [/ruby|war mage/, 'fire-gem'],
  [/cursed gem/, 'fire-gem'],
  [/gem|diamond|jewel/, 'gems'],
  [/charm/, 'gem-pendant'],
  [/holy symbol|symbol/, 'holy-symbol'],
  // Magic and curios
  [/sending stones/, 'rune-stone'],
  [/wand/, 'crystal-wand'],
  [/immovable rod|rod\b|staff/, 'wizard-staff'],
  [/orb/, 'orb-direction'],
  [/die\b|dice/, 'dice-six-faces-five'],
  [/pipe/, 'smoking-pipe'],
  [/music box|music/, 'musical-notes'],
  [/flower/, 'flower-pot'],
  [/trinket|curio/, 'jigsaw-box'],
  // Services and stories
  [/gossip|rumou?r|whisper/, 'talk'],
  [/wager|bet\b|bout/, 'two-coins'],
  [/coin/, 'coins'],
  [/bounty/, 'wanted-reward'],
  [/home|house/, 'house'],
]

/** Icon when nothing matches, by shop category */
const BY_CATEGORY: Record<string, string> = {
  gear: 'swap-bag',
  common: 'sparkles',
  uncommon: 'sparkles',
  rare: 'sparkles',
  very_rare: 'sparkles',
  legendary: 'sparkles',
  lore: 'tied-scroll',
}

/** Every icon name the rules can hand out (checked against the icon set in tests) */
export const RULE_ICONS = [...new Set([...RULES.map(r => r[1]), ...Object.values(BY_CATEGORY)])]

/**
 * Best icon for an item name. `has` says whether an icon exists, `names` lets a single word
 * ("telescope") find an icon of the same name when no rule fits.
 */
export function guessShopIcon(name: string, category: string | null, has: (icon: string) => boolean = () => true, names: string[] = []): string {
  const n = name.toLowerCase()
  for (const [re, icon] of RULES) if (re.test(n) && has(icon)) return icon
  const words = n.replace(/[^a-z\s-]/g, ' ').split(/[\s-]+/).filter(w => w.length > 3)
  for (const w of words) {
    const single = w.replace(/(ies)$/, 'y').replace(/s$/, '')
    if (has(single)) return single
    const hit = names.filter(x => x.split('-').includes(single)).sort((a, b) => a.length - b.length)[0]
    if (hit) return hit
  }
  return BY_CATEGORY[category ?? 'gear'] ?? 'swap-bag'
}
