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
  whirl:{g:'旋',zh:'旋风斩',en:'Whirlwind',col:'#ffb04a',cost:26,cd:6,dur:1.5,d:'旋身连斩,持续伤害周围敌人。',de:'Spin for 1.5 seconds, slicing everything around you.'},
  leap:{g:'踏',zh:'踏雪斩',en:'Leaping Strike',col:'#9fe3f0',cost:30,cd:7,d:'向前跃斩,落地时震裂地面。',de:'Leap forward, invulnerable, and crack the ground where you land.'},
  roar:{g:'吼',zh:'狮吼功',en:'Lion Roar',col:'#ffd75a',cost:36,cd:10,d:'震慑周围敌人,击退并眩晕。',de:'A roar that knocks back and stuns everything nearby.'},
};
const SPELL_KEYS=['','1','2','3'];
const CLASSES={
  swordsman:{zh:'剑客',en:'Swordsman',g:'剑',col:'#9fe3f0',main:'sword',skills:['palm','array','talis'],hp:100,mana:100,regen:9,dmg:1,spd:1,d:'御剑远攻,攻守均衡。',de:'Ranged flying swords. Balanced attack and defence.'},
  taoist:{zh:'道士',en:'Taoist',g:'道',col:'#ffd27a',main:'charm',skills:['talis','bagua','ward'],hp:80,mana:150,regen:14,dmg:.95,spd:1,d:'体弱而内力深厚,符咒法术繁多。',de:'Fragile, but deep qi reserves and plenty of talisman magic.'},
  blademaster:{zh:'刀客',en:'Blademaster',g:'刀',col:'#ff9c5a',main:'slash',skills:['whirl','leap','roar'],hp:135,mana:80,regen:8,dmg:1.15,spd:1.06,d:'近身刀法,皮糙肉厚,伤害最高。',de:'Up-close blade work. Tough, fast and the hardest hitter.'},
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
  burst:{g:'连',zh:'连击',en:'Double Strike',d:'每次施放连发两轮。',de:'Every cast fires twice in a row.',for:['sword','palm','talis','charm','slash','leap','roar']},
  split:{g:'裂',zh:'分光',en:'Split',d:'命中时分裂成两道。符咒则分裂成子符。',de:'Shots split on hit. Talismans drop sub-talismans.',for:['sword','palm','talis','charm']},
  giant:{g:'雄',zh:'雄浑',en:'Mighty',d:'更大,伤害 +30%,出手稍慢。',de:'Bigger, +30% damage, slightly slower.',for:['sword','palm','talis','array','charm','slash','whirl','leap','roar','bagua']},
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
  assassin:{hp:10,spd:66,dmg:6,r:5,xp:1,zh:'刺客'},
  bandit:{hp:26,spd:33,dmg:9,r:6,xp:2,zh:'刀客'},
  archer:{hp:20,spd:30,dmg:7,r:6,xp:3,shoot:1,zh:'弓手'},
  giant:{hp:140,spd:23,dmg:16,r:10,xp:8,zh:'铁甲力士'},
};
const BOSS_NAME=['血魔教主','Blood Demon Patriarch'];

/* ---------- skill trees (Diablo / Last Epoch style) ----------
   Generic node effects the simulation understands:
   dmg (+12%/rank), cd (-8%/rank), count (+1 projectile/piece), pierce (+1), size (+15%/rank),
   cost (-15% qi/rank), dur (+1s/rank), knock (+50%/rank), crit (+5%/rank), life (2% lifesteal/rank), chain (15%/rank chance to arc) */
const NODE_FX={dmg:.12,cd:.08,count:1,pierce:1,size:.15,cost:.15,dur:1,knock:.5,crit:.05,life:.02,chain:.15};
const N=(fx,zh,en,max,tier,d)=>({fx,zh,en,max,tier,d});
const TREES={
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
  roar:[N('size','声震','Resounding',3,1,'范围 +15% / 级'),N('dmg','狮吼','Lion\'s Might',3,1,'伤害 +12% / 级'),N('knock','摧心','Heart Crusher',2,2,'击退 +50% / 级'),N('cd','连吼','Chain Roar',3,2,'冷却 -8% / 级'),N('cost','丹田','Dantian',2,3,'内力消耗 -15% / 级'),N('dur','余威','Lingering Fear',2,3,'眩晕 +1s / 级')],
};
const ATTRS=[
  {id:'str',zh:'力',en:'Strength',d:'伤害 +4% / 点',de:'+4% damage per point'},
  {id:'vit',zh:'体',en:'Vitality',d:'生命上限 +8 / 点',de:'+8 max HP per point'},
  {id:'spr',zh:'灵',en:'Spirit',d:'内力 +6,回复 +4% / 点',de:'+6 qi and +4% regen per point'},
  {id:'agi',zh:'敏',en:'Agility',d:'移速 +2%,暴击 +1% / 点',de:'+2% speed, +1% crit per point'},
];
