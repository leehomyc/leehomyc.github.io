'use strict';
/* content.js — skills, elements, fusions, augmentations, perks, enemies */
const SPELLS={
  // swordsman
  sword:{g:'剑',zh:'飞剑',en:'Flying Sword',col:'#9fe3f0',auto:1,d:'普攻:自动射向最近的敌人,等级提升增加剑数。',de:'Normal attack. Fires at the nearest foe by itself; levels add more swords.'},
  palm:{g:'掌',zh:'劈空掌',en:'Palm Gale',col:'#ffb04a',cost:22,cd:3.2,d:'向最近的敌人劈出扇形掌风,击退。',de:'A fan of palm strikes toward the nearest foe, with heavy knockback.'},
  array:{g:'阵',zh:'剑阵',en:'Sword Array',col:'#c7a4f0',cost:38,cd:12,dur:6,d:'召出环绕飞剑,持续六秒。',de:'Summons orbiting swords for six seconds.'},
  talis:{g:'符',zh:'天雷符',en:'Thunder Talisman',col:'#ffd75a',cost:30,cd:5.5,d:'将符咒掷向敌群,引下天雷。',de:'Hurls a talisman at the thickest crowd and calls down thunder.'},
  // taoist
  charm:{g:'箓',zh:'追魂箓',en:'Homing Charm',col:'#ffd27a',auto:1,d:'普攻:追踪敌人的符箓,命中时小范围爆裂。',de:'Normal attack. Paper charms that home in and burst on impact.'},
  bagua:{g:'卦',zh:'八卦阵',en:'Bagua Array',col:'#c7a4f0',cost:40,cd:13,dur:7,d:'八卦符箓环绕护体,范围更大。',de:'Trigram charms orbit you at a wide radius for seven seconds.'},
  ward:{g:'护',zh:'护身咒',en:'Warding Charm',col:'#7dffb0',cost:40,cd:14,d:'回复生命并获得四秒护罩,震开周围敌人。',de:'Heals, shields you for four seconds and pushes enemies back.'},
  // blademaster
  slash:{g:'刀',zh:'横扫',en:'Sweeping Blade',col:'#ff9c5a',auto:1,d:'普攻:近身横扫,贯穿一切。',de:'Normal attack. A close sweep that cuts through everything in front of you.'},
  great:{g:'重',zh:'重剑',en:'Greatsword',col:'#c9d6e8',auto:1,d:'普攻:缓慢的巨剑横劈,击退极强;每第三击化为重斩震地。',de:'Normal attack. Slow, huge arcs with massive knockback; every third swing is a ground-shaking slam.'},
  whisk:{g:'拂',zh:'拂尘',en:'Spirit Whisk',col:'#f4efe0',auto:1,d:'普攻:锁定一名敌人持续鞭打,越打越痛,五级起牵连第二人。',de:'Normal attack. A sustained lash on one target that ramps the longer it holds; chains to a second enemy from Lv 5.'},
  nodachi:{g:'斩',zh:'长刀',en:'Nodachi',col:'#ffb080',auto:1,d:'普攻:向敌人突进一步再挥出一道超长刀光。',de:'Normal attack. Lunge a step toward the enemy and draw a very long blade arc.'},
  drum:{g:'鼓',zh:'战鼓',en:'War Drum',col:'#ffd27a',auto:1,d:'普攻:擂鼓震出一圈冲击波,向四面扩散并击退。',de:'Normal attack. Each beat sends an expanding shockwave ring outward, knocking everything back.'},
  whirl:{g:'旋',zh:'旋风斩',en:'Whirlwind',col:'#ffb04a',cost:26,cd:6,dur:1.5,d:'旋身连斩,持续伤害周围敌人。',de:'Spin for 1.5 seconds, slicing everything around you.'},
  leap:{g:'踏',zh:'踏雪斩',en:'Leaping Strike',col:'#9fe3f0',cost:30,cd:7,d:'向前跃斩,落地时震裂地面。',de:'Leap forward, invulnerable, and crack the ground where you land.'},
  roar:{g:'吼',zh:'狮吼功',en:'Lion Roar',col:'#ffd75a',cost:36,cd:10,d:'震慑周围敌人,击退并眩晕。',de:'A roar that knocks back and stuns everything nearby.'},
  // fourth skills
  sunder:{g:'宗',zh:'万剑归宗',en:'Ten Thousand Swords',col:'#dff6ff',cost:60,cd:20,d:'剑雨从天而降,轰击最密集的敌群。',de:'A rain of swords hammers the thickest crowd.'},
  exorcise:{g:'驱',zh:'驱邪咒',en:'Exorcism',col:'#ffe9a0',cost:50,cd:18,d:'净化周围:重伤敌人,处决残血。',de:'Purge the area: heavy damage, and anything below 25% HP dies.'},
  frenzy:{g:'狂',zh:'血战',en:'Blood Frenzy',col:'#ff4a4a',cost:40,cd:16,dur:6,d:'六秒内伤害 +40%,移速 +25%,攻击吸血。',de:'For six seconds: +40% damage, +25% speed, lifesteal.'},
  // qin master
  wave:{g:'音',zh:'音波',en:'Sound Wave',col:'#8fe3ff',auto:1,d:'普攻:贯穿的音波,击中减速。',de:'Normal attack. Piercing sound waves that slow what they hit.'},
  flow:{g:'流',zh:'高山流水',en:'Flowing Stream',col:'#6fd3e8',cost:28,cd:7,d:'在敌群处奏出水流之域,持续伤害并减速。',de:'A field of flowing water on the crowd: damage over time and slow.'},
  ambush:{g:'伏',zh:'十面埋伏',en:'Ambush on Ten Sides',col:'#c7a4f0',cost:34,cd:9,d:'向十个方向奏出音波。',de:'Sound waves in ten directions.'},
  guangling:{g:'散',zh:'广陵散',en:'Guangling Melody',col:'#ffd27a',cost:45,cd:16,dur:5,d:'五秒内周围敌人持续受伤并减速,自身回复。',de:'For five seconds everything nearby takes damage and slows while you recover.'},
};
const SPELL_KEYS=['','1','2','3'];
const CLASSES={
  swordsman:{zh:'剑客',en:'Swordsman',g:'剑',col:'#9fe3f0',main:'sword',skills:['palm','array','talis','sunder'],hp:100,mana:100,regen:13,dmg:1,spd:1,d:'御剑远攻,攻守均衡。',de:'Ranged flying swords. Balanced attack and defence.'},
  taoist:{zh:'道士',en:'Taoist',g:'道',col:'#ffd27a',main:'charm',skills:['talis','bagua','ward','exorcise'],hp:90,mana:150,regen:19,dmg:.95,spd:1,d:'体弱而内力深厚,符咒法术繁多。',de:'Fragile, but deep qi reserves and plenty of talisman magic.'},
  blademaster:{zh:'刀客',en:'Blademaster',g:'刀',col:'#ff9c5a',main:'slash',skills:['whirl','leap','roar','frenzy'],hp:125,mana:80,regen:12,dmg:1.08,spd:1.06,d:'近身刀法,皮糙肉厚,伤害最高。',de:'Up-close blade work. Tough, fast and the hardest hitter.'},
  qin:{zh:'琴师',en:'Qin Master',g:'琴',col:'#8fe3ff',main:'wave',skills:['flow','ambush','guangling','exorcise'],hp:100,mana:130,regen:16,dmg:.9,spd:1.03,d:'以琴音御敌,减速与控场见长。',de:'Fights with music: slows, fields and crowd control.'},
};
const ELS={
  fire:{g:'火',zh:'烈火真气',en:'Fire',col:'#ff8a3c',d:'命中点燃,持续灼烧。',de:'Hits ignite enemies.'},
  ice:{g:'冰',zh:'寒冰真气',en:'Ice',col:'#8fdcf0',d:'减速,有几率冻结。',de:'Slows, with a chance to freeze.'},
  lightning:{g:'雷',zh:'紫电',en:'Lightning',col:'#ffe066',d:'电弧跳向附近敌人。',de:'Arcs jump to nearby enemies.'},
  acid:{g:'毒',zh:'蚀骨毒',en:'Poison',col:'#9ff06a',d:'留下毒雾,使敌人受伤增加。',de:'Leaves poison mist and weakens armour.'},
  dark:{g:'冥',zh:'幽冥',en:'Nether',col:'#b57cf0',d:'处决残血敌人,击杀可能回血。',de:'Executes weak enemies. Kills may heal you.'},
};
const FUS={
  'fire+ice':['阴阳','Yin-Yang','有几率喷出减速蒸汽云。','Hits may release a slowing steam cloud.'],
  'fire+lightning':['焚雷','Searing Thunder','电弧也会点燃敌人。','Arcs also ignite enemies.'],
  'acid+fire':['焚毒','Venom Blaze','毒雾化为烈焰,伤害翻倍。','Mist becomes fire and deals double damage.'],
  'dark+fire':['业火','Karmic Fire','燃烧中的敌人死亡时爆炸。','Burning enemies explode on death.'],
  'ice+lightning':['霜雷','Frost Thunder','对减速目标的电弧伤害翻倍。','Arcs deal double damage to slowed targets.'],
  'acid+ice':['寒毒','Frost Venom','毒雾同时减速敌人。','Mist also slows enemies.'],
  'dark+ice':['玄冰','Abyssal Ice','减速的敌人死亡时冻结周围。','Slowed enemies freeze neighbours when they die.'],
  'acid+lightning':['雷毒','Thunder Venom','毒雾会放出电弧。','Mist discharges arcs.'],
  'dark+lightning':['幽雷','Nether Thunder','电弧击杀必定回血。','Arc kills always heal you.'],
  'acid+dark':['瘟疫','Plague','中毒的敌人死亡时留下毒雾。','Poisoned enemies leave mist when they die.'],
};
const fusKey=(a,b)=>[a,b].sort().join('+');
const AUGS={
  burst:{g:'连',zh:'连击',en:'Double Strike',d:'每次施放连发两轮。',de:'Every cast fires twice in a row.',for:['sword','palm','talis','charm','slash','leap','roar','wave','ambush','sunder','exorcise']},
  split:{g:'裂',zh:'分光',en:'Split',d:'命中时分裂成两道。符咒则分裂成子符。',de:'Shots split on hit. Talismans drop sub-talismans.',for:['sword','palm','talis','charm','wave','ambush']},
  giant:{g:'雄',zh:'雄浑',en:'Mighty',d:'更大,伤害 +30%,出手稍慢。',de:'Bigger, +30% damage, slightly slower.',for:['sword','palm','talis','array','charm','slash','whirl','leap','roar','bagua','wave','flow','ambush','guangling','sunder','exorcise']},
  extra:{g:'增',zh:'增阵',en:'Wider Array',d:'阵法多两件法器,转得更快。',de:'Two more pieces in the array, spinning faster.',for:['array','bagua']},
};
const PERKS=[
  {g:'锋',zh:'锋锐',en:'Keen Edge',d:'所有伤害 +12%',de:'All damage +12%',a:P=>P.dmg*=1.12},
  {g:'罩',zh:'金钟罩',en:'Iron Bell',d:'受到伤害 -12%',de:'Damage taken -12%',a:P=>P.def*=.88},
  {g:'轻',zh:'轻身',en:'Light Step',d:'移动速度 +10%',de:'Move speed +10%',a:P=>P.spd*=1.1},
  {g:'息',zh:'内息',en:'Inner Breath',d:'内力上限 +30,回复更快',de:'+30 max qi and faster qi regen',a:P=>{P.maxMana+=30;P.regen*=1.2;P.mana=Math.min(P.maxMana,P.mana+30)}},
  {g:'命',zh:'生息',en:'Vitality',d:'生命上限 +25,并回复 25',de:'Max HP +25, heal 25',a:P=>{P.maxHp+=25;P.hp=Math.min(P.maxHp,P.hp+25)}},
  {g:'摄',zh:'摄物',en:'Lodestone',d:'拾取范围 +40%',de:'Pickup range +40%',a:P=>P.mag*=1.4},
  {g:'疾',zh:'疾风',en:'Haste',d:'冷却时间 -10%',de:'Cooldowns -10%',a:P=>P.haste*=1.1},
  {g:'杀',zh:'致命',en:'Deadly',d:'暴击率 +8%(双倍伤害)',de:'+8% chance of double damage',a:P=>P.crit+=.08},
];
const ETYPES={
  assassin:{hp:10,spd:66,dmg:6,r:5,xp:1,zh:'刺客',en:'assassin'},
  bandit:{hp:26,spd:33,dmg:9,r:6,xp:2,zh:'刀客',en:'bandit'},
  archer:{hp:20,spd:30,dmg:7,r:6,xp:3,shoot:1,zh:'弓手',en:'archer'},
  giant:{hp:140,spd:23,dmg:16,r:10,xp:8,zh:'铁甲力士',en:'iron giant'},
};
const BOSS_NAME=['血魔教主','Blood Demon Patriarch'];

/* ---------- skill trees (Diablo / Last Epoch style) ----------
   Generic node effects the simulation understands:
   dmg (+12%/rank), cd (-8%/rank), count (+1 projectile/piece), pierce (+1), size (+15%/rank),
   cost (-15% qi/rank), dur (+1s/rank), knock (+50%/rank), crit (+5%/rank), life (2% lifesteal/rank), chain (15%/rank chance to arc) */
const NODE_FX={dmg:.10,cd:.08,count:1,pierce:1,size:.15,cost:.15,dur:1,knock:.5,crit:.05,life:.02,chain:.15};
const NODE_EN={"+1 刀气 / 级": "+1 blade qi / rank", "+1 卦符 / 级": "+1 trigram / rank", "+1 掌风 / 级": "+1 palm wave / rank", "+1 波剑雨 / 级": "+1 sword-rain wave / rank", "+1 牵连目标 / 级": "+1 chained target / rank", "+1 符箓 / 级": "+1 talisman / rank", "+1 音波 / 级": "+1 wave / rank", "+1 飞剑 / 级": "+1 flying sword / rank", "+1 鼓波 / 级": "+1 drum ring / rank", "+2 方向 / 级": "+2 directions / rank", "一次掷出两符": "Throws two talismans at once", "伤害 +12% / 级": "Damage +12% / rank", "内力消耗 -15% / 级": "Qi cost -15% / rank", "冷却 -8% / 级": "Cooldown -8% / rank", "出刀 +8% / 级": "Draw speed +8% / rank", "出手 +8% / 级": "Attack speed +8% / rank", "击退 +50% / 级": "Knockback +50% / rank", "刀光 +15% / 级": "Arc length +15% / rank", "半径 +15% / 级": "Radius +15% / rank", "吸血更多": "Stronger lifesteal", "命中回复生命": "Hits heal you", "命中有几率引发剑气跳击": "Hits may chain sword qi to another enemy", "命中有几率引发电弧": "Hits may arc lightning", "回复更多": "Heals more", "射程 +15% / 级": "Range +15% / rank", "护罩 +1s / 级": "Shield +1 s / rank", "持续 +1s / 级": "Duration +1 s / rank", "挥速 +8% / 级": "Swing speed +8% / rank", "攻速 +8% / 级": "Attack speed +8% / rank", "暴击 +5% / 级": "Crit +5% / rank", "波及范围 +15% / 级": "Reach +15% / rank", "爆裂范围 +15% / 级": "Blast radius +15% / rank", "眩晕 +1s / 级": "Stun +1 s / rank", "穿透 +1 / 级": "Pierce +1 / rank", "突进留下伤敌残影": "The lunge leaves a damaging afterimage", "范围 +15% / 级": "Area +15% / rank", "蓄满时有几率引雷": "At full charge, may call lightning", "血战伤害 +12% / 级": "Frenzy damage +12% / rank", "震地有几率引发连锁震击": "Slams may chain a second quake", "震开伤害 +12% / 级": "Shockwave damage +12% / rank", "震开范围 +15% / 级": "Shockwave radius +15% / rank", "鞭速 +8% / 级": "Lash speed +8% / rank", "鼓波命中有几率震出余波": "Drum hits may ripple an aftershock", "鼓速 +8% / 级": "Beat speed +8% / rank"};
const N=(fx,zh,en,max,tier,d)=>({fx,zh,en,max,tier,d,de:NODE_EN[d]||d});
const TREES={
  great:[N('dmg','沉重','Heft',3,1,'伤害 +12% / 级'),N('size','阔刃','Broad Blade',3,1,'范围 +15% / 级'),N('cd','挥洒','Fluid Swing',3,2,'挥速 +8% / 级'),N('knock','崩山','Avalanche',2,2,'击退 +50% / 级'),N('crit','断金','Steel Breaker',2,3,'暴击 +5% / 级'),N('chain','地裂','Fissure',2,3,'震地有几率引发连锁震击')],
  whisk:[N('dmg','拂劲','Lash Force',3,1,'伤害 +12% / 级'),N('cd','疾鞭','Quick Lash',3,1,'鞭速 +8% / 级'),N('size','长拂','Long Reach',2,2,'射程 +15% / 级'),N('count','牵丝','Silk Threads',2,2,'+1 牵连目标 / 级'),N('crit','点穴','Pressure Point',2,3,'暴击 +5% / 级'),N('chain','雷拂','Thunder Whisk',2,3,'蓄满时有几率引雷')],
  nodachi:[N('dmg','刀意','Blade Intent',3,1,'伤害 +12% / 级'),N('size','长光','Long Light',3,1,'刀光 +15% / 级'),N('cd','拔刀','Quick Draw',3,2,'出刀 +8% / 级'),N('knock','逆风','Headwind',2,2,'击退 +50% / 级'),N('crit','一闪','Flash',2,3,'暴击 +5% / 级'),N('chain','残影','Afterimage',2,3,'突进留下伤敌残影')],
  drum:[N('dmg','鼓劲','Drum Force',3,1,'伤害 +12% / 级'),N('size','远震','Far Tremor',3,1,'波及范围 +15% / 级'),N('cd','急鼓','Rapid Beat',3,2,'鼓速 +8% / 级'),N('knock','震退','Repulse',2,2,'击退 +50% / 级'),N('count','叠鼓','Double Beat',2,2,'+1 鼓波 / 级'),N('chain','裂地','Quake',2,3,'鼓波命中有几率震出余波')],
  sword:[N('count','剑影','Sword Shadows',3,1,'+1 飞剑 / 级'),N('dmg','锋锐','Keen Edge',3,1,'伤害 +12% / 级'),N('cd','疾射','Quick Draw',3,2,'出手 +8% / 级'),N('pierce','贯穿','Pierce',2,2,'穿透 +1 / 级'),N('crit','要害','Vital Strike',2,3,'暴击 +5% / 级'),N('chain','剑气纵横','Sword Qi',2,3,'命中有几率引发剑气跳击')],
  palm:[N('dmg','刚猛','Vigour',3,1,'伤害 +12% / 级'),N('count','掌影','Palm Shadows',2,1,'+1 掌风 / 级'),N('knock','排山','Mountain Push',2,2,'击退 +50% / 级'),N('cd','连环','Chained Palms',3,2,'冷却 -8% / 级'),N('cost','气沉','Deep Breath',2,3,'内力消耗 -15% / 级'),N('size','掌风如山','Gale Palm',2,3,'范围 +15% / 级')],
  array:[N('count','增剑','More Blades',3,1,'+1 飞剑 / 级'),N('dur','久持','Lasting',3,1,'持续 +1s / 级'),N('dmg','剑意','Sword Intent',3,2,'伤害 +12% / 级'),N('size','广阵','Wide Array',2,2,'半径 +15% / 级'),N('cd','周天','Circulation',2,3,'冷却 -8% / 级'),N('life','饮血','Blood Drinker',2,3,'命中回复生命')],
  talis:[N('dmg','天威','Heaven\'s Wrath',3,1,'伤害 +12% / 级'),N('size','雷域','Thunder Field',3,1,'范围 +15% / 级'),N('cd','急召','Swift Call',3,2,'冷却 -8% / 级'),N('cost','省符','Thrifty',2,2,'内力消耗 -15% / 级'),N('count','双符','Twin Talismans',1,3,'一次掷出两符'),N('chain','雷霆万钧','Rolling Thunder',2,3,'命中有几率引发电弧')],
  charm:[N('count','分箓','Split Charm',3,1,'+1 符箓 / 级'),N('dmg','灵力','Spirit Power',3,1,'伤害 +12% / 级'),N('size','爆裂','Burst',3,2,'爆裂范围 +15% / 级'),N('cd','快诵','Fast Chant',3,2,'出手 +8% / 级'),N('chain','引雷','Call Lightning',2,3,'命中有几率引发电弧'),N('life','摄魂','Soul Drain',2,3,'命中回复生命')],
  bagua:[N('count','增卦','More Trigrams',2,1,'+1 卦符 / 级'),N('dur','固阵','Steady Array',3,1,'持续 +1s / 级'),N('dmg','阵威','Array Might',3,2,'伤害 +12% / 级'),N('size','大阵','Grand Array',2,2,'半径 +15% / 级'),N('cd','轮转','Rotation',2,3,'冷却 -8% / 级'),N('knock','震退','Repel',2,3,'击退 +50% / 级')],
  ward:[N('dur','久护','Long Ward',3,1,'护罩 +1s / 级'),N('cost','静心','Calm Mind',2,1,'内力消耗 -15% / 级'),N('cd','常驻','Ever Ready',3,2,'冷却 -8% / 级'),N('size','广护','Wide Ward',2,2,'震开范围 +15% / 级'),N('dmg','反震','Backlash',3,3,'震开伤害 +12% / 级'),N('knock','逐邪','Banish',2,3,'击退 +50% / 级')],
  slash:[N('dmg','刀劲','Blade Force',3,1,'伤害 +12% / 级'),N('size','长刀','Long Reach',3,1,'范围 +15% / 级'),N('cd','快刀','Fast Blade',3,2,'攻速 +8% / 级'),N('count','刀影','Blade Shadows',2,2,'+1 刀气 / 级'),N('crit','断魂','Soul Cutter',2,3,'暴击 +5% / 级'),N('life','嗜血','Bloodthirst',2,3,'命中回复生命')],
  whirl:[N('dur','久旋','Long Spin',3,1,'持续 +1s / 级'),N('dmg','旋劲','Spin Force',3,1,'伤害 +12% / 级'),N('size','广旋','Wide Spin',2,2,'半径 +15% / 级'),N('cost','顺气','Smooth Qi',2,2,'内力消耗 -15% / 级'),N('cd','不止','Relentless',2,3,'冷却 -8% / 级'),N('life','血旋','Blood Spin',2,3,'命中回复生命')],
  leap:[N('dmg','重落','Heavy Landing',3,1,'伤害 +12% / 级'),N('size','地裂','Fissure',3,1,'范围 +15% / 级'),N('cd','再跃','Leap Again',3,2,'冷却 -8% / 级'),N('knock','震荡','Shockwave',2,2,'击退 +50% / 级'),N('cost','轻盈','Light Body',2,3,'内力消耗 -15% / 级'),N('crit','致命一跃','Deadly Leap',2,3,'暴击 +5% / 级')],
  sunder:[N('dmg','剑威','Sword Might',3,1,'伤害 +12% / 级'),N('size','剑域','Sword Field',3,1,'范围 +15% / 级'),N('cd','归心','Swift Return',3,2,'冷却 -8% / 级'),N('cost','御气','Qi Mastery',2,2,'内力消耗 -15% / 级'),N('count','剑雨','Sword Rain',2,3,'+1 波剑雨 / 级'),N('crit','诛心','Heart Piercer',2,3,'暴击 +5% / 级')],
  exorcise:[N('size','净域','Purified Ground',3,1,'范围 +15% / 级'),N('dmg','神罚','Divine Wrath',3,1,'伤害 +12% / 级'),N('cd','诵经','Chanting',3,2,'冷却 -8% / 级'),N('cost','清心','Clear Mind',2,2,'内力消耗 -15% / 级'),N('life','超度','Deliverance',2,3,'命中回复生命'),N('knock','驱散','Dispel',2,3,'击退 +50% / 级')],
  frenzy:[N('dur','久战','Long Fight',3,1,'持续 +1s / 级'),N('dmg','嗜杀','Bloodlust',3,1,'血战伤害 +12% / 级'),N('cd','不死','Undying',3,2,'冷却 -8% / 级'),N('cost','怒气','Rage',2,2,'内力消耗 -15% / 级'),N('life','饮血','Blood Drinker',2,3,'吸血更多'),N('crit','狂暴','Berserk',2,3,'暴击 +5% / 级')],
  wave:[N('count','和弦','Chord',3,1,'+1 音波 / 级'),N('dmg','震音','Tremolo',3,1,'伤害 +12% / 级'),N('pierce','穿云','Cloud Piercer',2,2,'穿透 +1 / 级'),N('cd','急弦','Quick Strings',3,2,'出手 +8% / 级'),N('crit','裂石','Stone Splitter',2,3,'暴击 +5% / 级'),N('chain','惊雷','Thunder Note',2,3,'命中有几率引发电弧')],
  flow:[N('dur','长流','Long Flow',3,1,'持续 +1s / 级'),N('dmg','激流','Rapids',3,1,'伤害 +12% / 级'),N('size','广域','Wide Water',3,2,'范围 +15% / 级'),N('cd','连奏','Legato',3,2,'冷却 -8% / 级'),N('cost','静水','Still Water',2,3,'内力消耗 -15% / 级'),N('life','润泽','Nourish',2,3,'命中回复生命')],
  ambush:[N('dmg','杀机','Killing Intent',3,1,'伤害 +12% / 级'),N('count','重围','Encirclement',2,1,'+2 方向 / 级'),N('pierce','贯阵','Break Ranks',2,2,'穿透 +1 / 级'),N('cd','急奏','Presto',3,2,'冷却 -8% / 级'),N('knock','震退','Repel',2,3,'击退 +50% / 级'),N('cost','省力','Economy',2,3,'内力消耗 -15% / 级')],
  guangling:[N('dur','余音','Lingering Note',3,1,'持续 +1s / 级'),N('dmg','绝响','Final Chord',3,1,'伤害 +12% / 级'),N('size','满座','Full House',2,2,'范围 +15% / 级'),N('cd','再奏','Encore',3,2,'冷却 -8% / 级'),N('life','养神','Restore',2,3,'回复更多'),N('cost','静心','Calm',2,3,'内力消耗 -15% / 级')],
  roar:[N('size','声震','Resounding',3,1,'范围 +15% / 级'),N('dmg','狮吼','Lion\'s Might',3,1,'伤害 +12% / 级'),N('knock','摧心','Heart Crusher',2,2,'击退 +50% / 级'),N('cd','连吼','Chain Roar',3,2,'冷却 -8% / 级'),N('cost','丹田','Dantian',2,3,'内力消耗 -15% / 级'),N('dur','余威','Lingering Fear',2,3,'眩晕 +1s / 级')],
};
const ATTRS=[
  {id:'str',zh:'力',en:'Strength',d:'伤害 +4% / 点',de:'+4% damage per point'},
  {id:'vit',zh:'体',en:'Vitality',d:'生命上限 +8 / 点',de:'+8 max HP per point'},
  {id:'spr',zh:'灵',en:'Spirit',d:'内力 +6,回复 +4% / 点',de:'+6 qi and +4% regen per point'},
  {id:'agi',zh:'敏',en:'Agility',d:'移速 +2%,暴击 +1% / 点',de:'+2% speed, +1% crit per point'},
];

/* ---------- 法宝 relics: unique passives dropped by elites, bosses and chests ---------- */
const RELICS={
  jade:{g:'玉',zh:'玉佩',en:'Jade Pendant',d:'所有伤害 3% 吸血',de:'3% lifesteal on all damage',col:'#7dffb0'},
  pearl:{g:'珠',zh:'雷珠',en:'Thunder Pearl',d:'命中有 12% 几率引发电弧',de:'12% chance on hit to arc lightning',col:'#ffe066'},
  boots:{g:'靴',zh:'铁靴',en:'Iron Boots',d:'移速 +12%,轻功冷却 -25%',de:'+12% speed, dash cooldown -25%',col:'#9fe3f0'},
  shell:{g:'甲',zh:'龟甲',en:'Tortoise Shell',d:'受到伤害 -15%',de:'Damage taken -15%',col:'#7fc98a'},
  feather:{g:'羽',zh:'凤羽',en:'Phoenix Feather',d:'复生核心 +1',de:'+1 Revive Core',col:'#ff8a3c'},
  blood:{g:'血',zh:'血玉',en:'Blood Jade',d:'生命低于一半时伤害 +25%',de:'+25% damage below half HP',col:'#e0503f'},
  bowl:{g:'盆',zh:'聚宝盆',en:'Treasure Bowl',d:'金币 +30%,拾取范围 +40%',de:'+30% gold, +40% pickup range',col:'#ffd27a'},
  iron:{g:'寒',zh:'寒铁',en:'Cold Iron',d:'命中减速敌人',de:'Hits slow enemies',col:'#8fdcf0'},
  charm:{g:'符',zh:'火符',en:'Fire Charm',d:'击杀时小范围爆炸',de:'Kills explode in a small blast',col:'#ff7a2c'},
  chime:{g:'铃',zh:'风铃',en:'Wind Chime',d:'冷却 -15%',de:'Cooldowns -15%',col:'#c7a4f0'},
  pill:{g:'丹',zh:'灵芝丹',en:'Lingzhi Pill',d:'生命上限 +40,每秒回复 1',de:'+40 max HP, regenerate 1 HP/s',col:'#ff6a52'},
  taiji:{g:'极',zh:'太极图',en:'Taiji Diagram',d:'武学内力消耗 -25%',de:'Skills cost 25% less qi',col:'#efe4cd'},
};

/* ---------- maps (themes) and achievements ---------- */
const MAPS={
  valley:{zh:'青竹谷',en:'Bamboo Valley',base:'#355c42',blobs:['#467a3e','#274d3b','#5a8a44','#2e6047','#73904a','#214a3e','#6b6a40','#3f6b5a'],grain:['#1d3c2e','#527a3e','#6f8a48','#25503c','#3f6b40','#6a5d3a'],trail:['#5f5a3a','#8f7a52','#ab9468'],plaza:'#2a2c27',fog:'#7d9a98',sun:'#ffc58a',hemi:['#a9c8ff','#3d5436'],water:[[.012,.08,.10],[.42,.6,.72]],pine:['#17382c','#2f6a48'],bamboo:['#6f9a3f','#aacb5e'],grassTips:['#7ea04c','#5d9150','#a5a556'],grassRoot:'#173a2c',maple:[['#8e2a22','#e8713a'],['#a84a22','#f0a040']],lantern:'#ff5a2a',edge:'18,30,34'},
  snow:{zh:'雪岭关',en:'Snow Pass',need:'boss2',base:'#c9d6dc',blobs:['#dfe8ec','#b8c8d0','#e8eef1','#a9bcc6','#d2dde2','#98aab4','#c3b9a8','#b0c4cc'],grain:['#e9f0f3','#a9bcc6','#d7e0e4','#8fa3ad','#f4f7f8','#b9b0a0'],trail:['#6a6058','#8d8278','#a69a8c'],plaza:'#4a4e52',fog:'#b9c9d2',sun:'#ffe4c8',hemi:['#cfe0ff','#6a7a84'],water:[[.05,.14,.2],[.72,.84,.92]],pine:['#2b4a3e','#e9f1f3'],bamboo:['#8a9a7a','#dfe8e2'],grassTips:['#dfe8ec','#b9c8cc','#e8e2cf'],grassRoot:'#7a8a8a',maple:[['#5a3a2e','#e9f1f3'],['#6a4a36','#f3f6f7']],lantern:'#ffb04a',edge:'60,74,86'},
  ember:{zh:'焚天寺',en:'Burning Monastery',need:'boss4',base:'#2a1c1a',blobs:['#3a2420','#4a2a1e','#221614','#5a2e22','#3b1f1b','#1c1210','#6a3a24','#2e1a16'],grain:['#5a2e22','#ff6a2a','#3a2420','#8a4a2a','#1c1210','#ffa040'],trail:['#1a1210','#4a3a30','#6a5a48'],plaza:'#1c1614',fog:'#3a2420',sun:'#ff8a4a',hemi:['#ff9a6a','#2a1410'],water:[[.6,.18,.02],[1.2,.55,.12]],pine:['#1a1210','#ff6a2a'],bamboo:['#2a1c18','#ff8a3a'],grassTips:['#8a3a22','#ff6a2a','#5a2a1a'],grassRoot:'#1c1210',maple:[['#1a1210','#ff5a2a'],['#2a1a14','#ffa040']],lantern:'#ff3a1a',edge:'20,10,8'},
};
const ACH=[
  {id:'boss1',zh:'初战告捷',en:'First Blood',d:'击败一位首领',de:'Slay a boss',gold:100},
  {id:'boss2',zh:'连斩二魔',en:'Two Down',d:'一局击败两位首领 · 解锁雪岭关',de:'Slay two bosses in one run · unlocks Snow Pass',gold:200},
  {id:'boss4',zh:'四魔皆灭',en:'Demon Hunter',d:'一局击败四位首领 · 解锁焚天寺',de:'Slay four bosses in one run · unlocks Burning Monastery',gold:400},
  {id:'combo100',zh:'百人斩',en:'Hundred Cuts',d:'连斩 ×100',de:'Reach a ×100 kill streak',gold:120},
  {id:'combo200',zh:'武林神话',en:'Legend',d:'连斩 ×200',de:'Reach a ×200 kill streak',gold:300},
  {id:'min10',zh:'十分钟',en:'Ten Minutes',d:'存活 10 分钟',de:'Survive 10 minutes',gold:150},
  {id:'min20',zh:'半炷香',en:'Twenty Minutes',d:'存活 20 分钟',de:'Survive 20 minutes',gold:400},
  {id:'relic6',zh:'法宝收藏家',en:'Collector',d:'一局集齐 6 件法宝',de:'Hold 6 relics in one run',gold:150},
  {id:'allcls',zh:'四大高手',en:'Master of Four',d:'用四个职业各击败一位首领',de:'Slay a boss with every class',gold:500},
  {id:'hard',zh:'炼狱',en:'Inferno',d:'困难难度击败一位首领',de:'Slay a boss on Hard',gold:300},
];
const DIFF={easy:{zh:'简单',en:'Easy',hp:.7,dmg:.7,gold:.8},normal:{zh:'普通',en:'Normal',hp:1,dmg:1,gold:1},hard:{zh:'困难',en:'Hard',hp:1.4,dmg:1.35,gold:1.4}};

/* weapons: the normal attack of a class is swappable; chosen on the title screen */
const WEAPONS={swordsman:['sword','great'],taoist:['charm','whisk'],blademaster:['slash','nodachi'],qin:['wave','drum']};
const WEAPON_INFO={
  sword:{trait:['快而多','Fast, many blades'],awake:['剑雨·飞剑数 +2,伤害 +25%','Sword Rain: +2 blades, +25% damage']},
  great:{need:'clsboss',cost:500,trait:['重击·震地','Heavy hits, ground slam'],awake:['开山·每第二击震地,震地范围 +40%','Mountain Splitter: slam every second swing, +40% slam radius']},
  charm:{trait:['追踪·爆裂','Homing, explodes'],awake:['万符·符数 +2,爆炸范围 +30%','Myriad Charms: +2 charms, +30% blast radius']},
  whisk:{need:'clsboss',cost:500,trait:['持续·蓄力','Sustained, ramps up'],awake:['三清·牵连三名敌人,蓄力上限 +60%','Three Pure Ones: chains to three enemies, ramp cap doubled']},
  slash:{trait:['贯穿·扇形','Piercing fan'],awake:['刀海·刀气 +3,范围 +25%','Sea of Blades: +3 blade qi, +25% reach']},
  nodachi:{need:'clsboss',cost:500,trait:['突进·长刀光','Lunge, long arc'],awake:['居合·突进更远,刀光留下灼痕','Iaido: longer lunge, the arc leaves a burning trail']},
  wave:{trait:['穿透·减速','Pierces, slows'],awake:['裂帛·音波 +2,穿透 +2','Rending Note: +2 waves, +2 pierce']},
  drum:{need:'clsboss',cost:500,trait:['环形冲击·击退','Ring shockwave, knockback'],awake:['雷鼓·双重鼓波,范围 +30%','Thunder Drum: double ring, +30% radius']},
};
const AWAKE_LV=15;
/* skill categories for the card screen */
const CATS={melee:['近战','Melee','#ff9c5a'],ranged:['远程','Ranged','#9fe3f0'],summon:['阵法','Summon','#c7a4f0'],defense:['防御','Defense','#7dffb0'],heal:['治疗','Heal','#7fc98a'],control:['控制','Control','#ffd75a'],element:['真气','Element','#ff8a3c'],augment:['强化','Augment','#d6a54a'],passive:['心法','Passive','#efe4cd'],all:['全体攻击','All attacks','#ffd27a'],tree:['武学树','Tree','#ffd27a'],new:['新武学','New skill','#ffffff']};
const KINDS={level:['技能升级','Skill level up','#9fe3f0'],new:['新武学','New skill','#ffffff'],element:['灌注真气','Element','#ff8a3c'],fusion:['真气融合','Fusion','#ff8a3c'],tree:['武学树','Skill tree','#ffd27a'],augment:['强化','Augment','#d6a54a'],passive:['心法·被动','Passive','#efe4cd'],awake:['武器觉醒','Awakening','#ffd27a'],jackpot:['天降横财','Jackpot','#ffd27a']};
const SKILL_CAT={great:'melee',whisk:'ranged',nodachi:'melee',drum:'control',sword:'ranged',palm:'ranged',array:'summon',talis:'ranged',charm:'ranged',bagua:'summon',ward:'defense',slash:'melee',whirl:'melee',leap:'melee',roar:'control',sunder:'ranged',exorcise:'control',frenzy:'melee',wave:'ranged',flow:'control',ambush:'ranged',guangling:'heal'};
const PERK_CAT={锋锐:'all',金钟罩:'defense',轻身:'passive',内息:'passive',生息:'heal',摄物:'passive',疾风:'passive',致命:'all'};
/* boss signature moves, by boss index (see BOSSES in sim.js) */
const BOSS_SIG=[['bloodrain','drain'],['spiral','blink'],['eggs','venom'],['bonewall','spikes'],['hellring','meteor'],['mirror','bewitch'],['phalanx','cannon']];
const BOSS_HINT=[['血雨落处勿站,他吸血时拉开距离','Step out of the blood rain; back away when he drains'],['刀影螺旋有缝,他消失时准备闪避','The blade spiral has gaps; dash when he vanishes'],['蛊卵孵化前踩灭,远离毒雾','Stamp the eggs before they hatch; avoid the poison'],['骨墙缓慢,轻功穿过;脚下骨刺看地面','Dash through the bone walls; watch the ground for spikes'],['火环留一缺口,陨星落点必须离开','The fire ring leaves one gap; leave the meteor mark'],['幻影一击即碎,粉色波纹碰到会颠倒方向','Illusions shatter in one hit; the pink ring reverses your controls'],['盾墙挡路绕开,炮击落在你站过的地方','Go around the shield wall; the volleys land where you stood']];
/* PK mode: point values, last hit takes all */
const PK_LEN=600;
const PTS={assassin:1,bandit:2,archer:3,giant:8,statue:0};
function pts(e){if(e.type==='boss')return 300+150*(e.n||0);if(e.warlord)return 60;let p=PTS[e.type]||1;if(e.elite)p*=3;if(e.role)p*=2;if(e.affix)p=Math.round(p*1.5);return p}
const PK_EVENTS={chest:25,mission:40,ambush:50};
const ACTIVE_MULT=2.6;  // damage multiplier for qi-costing skills (see hit())
