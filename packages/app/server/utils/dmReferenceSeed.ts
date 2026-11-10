/**
 * Starter sections for the DM Screen (side panel rules reference).
 * Plain text in DM Hero's formatting: "## Heading", "- bullet", "Label: text", **bold**.
 * Rules follow the 5e SRD (2014). Every section is editable in the app.
 */
export const DM_REFERENCE_SEED: { title: string, icon: string, body: string }[] = [
  {
    title: 'Combat basics',
    icon: 'mdi-sword-cross',
    body: `## Running a round
1. Surprise: hiders roll Stealth vs each foe's passive Perception. Surprised creatures can't move, act or react on their first turn.
2. Everyone rolls initiative (d20 + Dex). Highest goes first; ties: players choose, or roll off.
3. Turns go in order. One round is about 6 seconds.

## On a turn
- **Move** up to speed. Movement can be split around the action.
- **One action** (see below).
- **One bonus action**, only if a feature or spell gives one.
- **One free object interaction**: draw a weapon, open a door.
- **One reaction** per round, reset at the start of their turn.

## Actions
Attack: one weapon attack (more with Extra Attack). Grapple or shove replaces one attack.
Cast a Spell: casting time of 1 action.
Dash: extra movement equal to speed.
Disengage: no opportunity attacks against them this turn.
Dodge: attacks against them have disadvantage; Dex saves have advantage.
Help: an ally gets advantage on their next check or attack.
Hide: Stealth check, needs cover or being out of sight.
Ready: pick a trigger and an action; it fires as a reaction.
Search: Perception or Investigation.
Use an Object: anything beyond the free interaction.

## Attacks
- **Roll**: d20 + ability modifier + proficiency vs AC. Melee uses Str (finesse can use Dex); ranged uses Dex.
- **Natural 20**: hit and crit. Roll all damage dice twice, add modifiers once.
- **Natural 1**: miss.
- **Advantage / disadvantage**: roll 2d20, take higher / lower. They don't stack; one of each cancels out.
- **Ranged in melee**: disadvantage if a hostile creature is within 5 ft. Long range: disadvantage.
- **Opportunity attack**: a reaction when a hostile creature you can see leaves your reach.
- **Two weapons**: light weapon in each hand; bonus action off-hand attack, no ability modifier on its damage (unless negative).
- **Grapple**: Athletics vs the target's Athletics or Acrobatics. Target's speed becomes 0.
- **Shove**: same contest; knock prone or push 5 ft.

## Cover and terrain
Half cover: +2 AC and Dex saves (low wall, another creature).
Three-quarters cover: +5 AC and Dex saves (arrow slit).
Total cover: can't be targeted directly.
Difficult terrain: every foot costs 2 feet.
Standing up from prone: costs half your speed.

## Dropping to 0 HP
- **Unconscious**, rolling a death save at the start of each turn: d20, 10+ succeeds.
- **3 successes**: stable. **3 failures**: dead.
- **Natural 1** counts as two failures. **Natural 20**: back up with 1 HP.
- **Damage at 0 HP**: one failure (a crit is two).
- **Massive damage**: if leftover damage equals their HP max, instant death.
- **Stabilize**: DC 10 Medicine, or a healer's kit.

## Concentration
- One concentration spell at a time.
- Taking damage: Con save, DC 10 or half the damage, whichever is higher.
- Ends if incapacitated or killed.

## Rests
Short rest: 1 hour. Spend Hit Dice to heal.
Long rest: 8 hours. Regain all HP and half your Hit Dice (minimum 1). Once per 24 hours.`,
  },
  {
    title: 'Conditions',
    icon: 'mdi-alert-circle-outline',
    body: `Blinded: can't see; fails sight checks. Attacks against it have advantage; its attacks have disadvantage.
Charmed: can't attack the charmer. The charmer has advantage on social checks with it.
Deafened: can't hear; fails hearing checks.
Frightened: disadvantage on checks and attacks while it can see the source. Can't move closer to it.
Grappled: speed 0. Ends if the grappler is incapacitated or it's moved out of reach.
Incapacitated: no actions or reactions.
Invisible: can't be seen without magic. Its attacks have advantage; attacks against it have disadvantage.
Paralyzed: incapacitated, can't move or speak. Fails Str and Dex saves. Attacks against it have advantage; hits within 5 ft are crits.
Petrified: turned to stone. Incapacitated, unaware, resistant to all damage, immune to poison and disease.
Poisoned: disadvantage on attacks and ability checks.
Prone: can only crawl. Its attacks have disadvantage. Attacks within 5 ft have advantage; farther attacks have disadvantage.
Restrained: speed 0. Its attacks and Dex saves have disadvantage; attacks against it have advantage.
Stunned: incapacitated, can't move, speaks falteringly. Fails Str and Dex saves. Attacks against it have advantage.
Unconscious: incapacitated, drops what it holds, falls prone. Fails Str and Dex saves. Attacks against it have advantage; hits within 5 ft are crits.

## Exhaustion
1. Disadvantage on ability checks
2. Speed halved
3. Disadvantage on attacks and saves
4. HP maximum halved
5. Speed 0
6. Death
A long rest with food and water removes one level.`,
  },
  {
    title: 'Checks and DCs',
    icon: 'mdi-dice-d20-outline',
    body: `## Setting a DC
Very easy: 5
Easy: 10
Medium: 15
Hard: 20
Very hard: 25
Nearly impossible: 30

## Quick rules
- **Passive score**: 10 + the check's total modifier (+5 with advantage, -5 with disadvantage).
- **Group check**: everyone rolls; the group succeeds if at least half succeed.
- **Contest**: both roll; higher wins, a tie keeps things as they were.

## Skills by ability
Strength: Athletics
Dexterity: Acrobatics, Sleight of Hand, Stealth
Intelligence: Arcana, History, Investigation, Nature, Religion
Wisdom: Animal Handling, Insight, Medicine, Perception, Survival
Charisma: Deception, Intimidation, Performance, Persuasion

## Body and environment
Carrying capacity: Str score × 15 lb.
Long jump: Str score in feet with a 10 ft run-up (half standing).
High jump: 3 + Str modifier feet with a run-up (half standing).
Falling: 1d6 bludgeoning per 10 ft, max 20d6. Lands prone.
Holding breath: 1 + Con modifier minutes (minimum 30 seconds).`,
  },
  {
    title: 'Weapons',
    icon: 'mdi-sword',
    body: `## Simple melee
- **Club**: 1d4 bludgeoning · light · 1 sp
- **Dagger**: 1d4 piercing · finesse, light, thrown 20/60 · 2 gp
- **Greatclub**: 1d8 bludgeoning · two-handed · 2 sp
- **Handaxe**: 1d6 slashing · light, thrown 20/60 · 5 gp
- **Javelin**: 1d6 piercing · thrown 30/120 · 5 sp
- **Light hammer**: 1d4 bludgeoning · light, thrown 20/60 · 2 gp
- **Mace**: 1d6 bludgeoning · 5 gp
- **Quarterstaff**: 1d6 bludgeoning · versatile 1d8 · 2 sp
- **Sickle**: 1d4 slashing · light · 1 gp
- **Spear**: 1d6 piercing · thrown 20/60, versatile 1d8 · 1 gp

## Simple ranged
- **Light crossbow**: 1d8 piercing · 80/320, loading, two-handed · 25 gp
- **Dart**: 1d4 piercing · finesse, thrown 20/60 · 5 cp
- **Shortbow**: 1d6 piercing · 80/320, two-handed · 25 gp
- **Sling**: 1d4 bludgeoning · 30/120 · 1 sp

## Martial melee
- **Battleaxe**: 1d8 slashing · versatile 1d10 · 10 gp
- **Flail**: 1d8 bludgeoning · 10 gp
- **Glaive**: 1d10 slashing · heavy, reach, two-handed · 20 gp
- **Greataxe**: 1d12 slashing · heavy, two-handed · 30 gp
- **Greatsword**: 2d6 slashing · heavy, two-handed · 50 gp
- **Halberd**: 1d10 slashing · heavy, reach, two-handed · 20 gp
- **Lance**: 1d12 piercing · reach, disadvantage within 5 ft · 10 gp
- **Longsword**: 1d8 slashing · versatile 1d10 · 15 gp
- **Maul**: 2d6 bludgeoning · heavy, two-handed · 10 gp
- **Morningstar**: 1d8 piercing · 15 gp
- **Pike**: 1d10 piercing · heavy, reach, two-handed · 5 gp
- **Rapier**: 1d8 piercing · finesse · 25 gp
- **Scimitar**: 1d6 slashing · finesse, light · 25 gp
- **Shortsword**: 1d6 piercing · finesse, light · 10 gp
- **Trident**: 1d6 piercing · thrown 20/60, versatile 1d8 · 5 gp
- **War pick**: 1d8 piercing · 5 gp
- **Warhammer**: 1d8 bludgeoning · versatile 1d10 · 15 gp
- **Whip**: 1d4 slashing · finesse, reach · 2 gp

## Martial ranged
- **Blowgun**: 1 piercing · 25/100, loading · 10 gp
- **Hand crossbow**: 1d6 piercing · 30/120, light, loading · 75 gp
- **Heavy crossbow**: 1d10 piercing · 100/400, heavy, loading, two-handed · 50 gp
- **Longbow**: 1d8 piercing · 150/600, heavy, two-handed · 50 gp
- **Net**: no damage, restrains · thrown 5/15 · 1 gp

## Firearms (optional, DMG)
- **Pistol**: 1d10 piercing · 30/90, loading
- **Musket**: 1d12 piercing · 40/120, loading, two-handed

## Weapon properties
Finesse: use Str or Dex.
Light: works for two-weapon fighting.
Heavy: Small creatures have disadvantage.
Loading: one shot per action, bonus action or reaction.
Reach: adds 5 ft to reach.
Thrown: range listed as normal/long.
Versatile: bigger die when used two-handed.`,
  },
  {
    title: 'Armor and gear',
    icon: 'mdi-shield-outline',
    body: `## Light armor (AC + full Dex)
- **Padded**: 11 + Dex · stealth disadvantage · 5 gp
- **Leather**: 11 + Dex · 10 gp
- **Studded leather**: 12 + Dex · 45 gp

## Medium armor (AC + Dex, max 2)
- **Hide**: 12 + Dex · 10 gp
- **Chain shirt**: 13 + Dex · 50 gp
- **Scale mail**: 14 + Dex · stealth disadvantage · 50 gp
- **Breastplate**: 14 + Dex · 400 gp
- **Half plate**: 15 + Dex · stealth disadvantage · 750 gp

## Heavy armor (no Dex)
- **Ring mail**: 14 · stealth disadvantage · 30 gp
- **Chain mail**: 16 · Str 13 · stealth disadvantage · 75 gp
- **Splint**: 17 · Str 15 · stealth disadvantage · 200 gp
- **Plate**: 18 · Str 15 · stealth disadvantage · 1,500 gp
- **Shield**: +2 AC · 10 gp

## Money
10 cp = 1 sp · 10 sp = 1 gp · 10 gp = 1 pp. 50 coins weigh 1 lb.

## Common prices
- **Ale**: 4 cp a mug · **Wine**: 2 sp common, 10 gp fine
- **Meal**: 3 sp modest, 5 sp comfortable, 8 sp wealthy
- **Inn, per night**: 5 sp modest, 8 sp comfortable, 2 gp wealthy, 4 gp aristocratic
- **Rations**: 5 sp a day
- **Clothes**: 5 sp common, 2 gp traveler's, 15 gp fine
- **Potion of healing**: 50 gp (2d4 + 2 HP)
- **Healer's kit**: 5 gp (10 uses, stabilize)
- **Thieves' tools**: 25 gp
- **Rope, 50 ft**: 1 gp · **Torch**: 1 cp · **Hooded lantern**: 5 gp · **Oil flask**: 1 sp
- **Arrows or bolts (20)**: 1 gp
- **Hirelings**: 2 sp a day untrained, 2 gp a day skilled
- **Ride in the city**: 1 cp a mile · **Messenger**: 2 cp a mile`,
  },
  {
    title: 'Campaign reminders',
    icon: 'mdi-map-legend',
    body: `## The world
- Things the table needs to remember about this setting.

## House rules
- Rulings you've made that you want to stay consistent.`,
  },
]
