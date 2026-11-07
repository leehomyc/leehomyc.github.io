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
  // monk
  staff:{g:'棍',zh:'禅杖',en:'Iron Staff',col:'#f0b35a',auto:1,d:'普攻:挥杖横扫四周,每第四击化为贯穿一线的突刺。',de:'Normal attack. Sweeps all around you; every fourth strike is a thrust that pierces a line.'},
  fist:{g:'拳',zh:'罗汉拳',en:'Arhat Fist',col:'#ffd0a0',auto:1,d:'普攻:连环快拳锁定一人,每第五拳震出一掌击退周围。',de:'Normal attack. Rapid punches on one target; every fifth punch is a palm blast that knocks everything back.'},
  vajra:{g:'刚',zh:'金刚不坏',en:'Vajra Body',col:'#ffe9a0',cost:34,cd:12,dur:3,d:'三秒内受到伤害 -70%,攻击你的敌人被反震。',de:'For three seconds take 70% less damage; anything that hits you is knocked back and hurt.'},
  tiger:{g:'伏',zh:'伏虎',en:'Tiger Subdue',col:'#ff9c5a',cost:30,cd:7,d:'扑向最密集的敌群,落地震慑眩晕。',de:'Pounce onto the thickest crowd and slam, stunning everything around.'},
  zen:{g:'禅',zh:'禅定',en:'Zen Stillness',col:'#7fc98a',cost:40,cd:16,dur:2,d:'原地入定两秒:回复三成生命与内力,每秒震开敌人。',de:'Sit in stillness for two seconds: recover 30% HP and qi, pulsing enemies away each second.'},
  sarira:{g:'舍',zh:'舍利金光',en:'Sarira Light',col:'#ffd27a',cost:55,cd:18,d:'放出一枚舍利绕身盘旋扩散,反复灼烧,最后炸开。',de:'Release a sarira that spirals outward around you, burning repeatedly, then bursts.'},
  // physician
  needle:{g:'针',zh:'毒针',en:'Poison Needles',col:'#9ff06a',auto:1,d:'普攻:三枚细针射向最近的敌人,命中叠加毒伤。',de:'Normal attack. Three thin needles at the nearest foe; every hit stacks poison.'},
  pouch:{g:'囊',zh:'药囊',en:'Herb Pouch',col:'#b6ff8a',auto:1,d:'普攻:将药囊掷向最密集处,炸开一片毒雾。',de:'Normal attack. Lobs a pouch at the thickest crowd; it bursts into poison mist.'},
  plague:{g:'疫',zh:'瘟疫',en:'Plague',col:'#c6ff5a',cost:32,cd:9,d:'标记附近八名敌人,持续中毒;死亡时留下毒雾。',de:'Marks eight nearby enemies with a wasting poison; they leave mist when they die.'},
  gu:{g:'蛊',zh:'蛊虫',en:'Gu Swarm',col:'#9ff06a',cost:28,cd:6,d:'放出四只追魂蛊虫,穿透并减速、叠毒。',de:'Four homing gu that pierce, slow and stack poison.'},
  rejuv:{g:'春',zh:'回春',en:'Rejuvenation',col:'#7fc98a',cost:36,cd:14,dur:3,d:'三秒内回复两成生命,解除迷乱并获得短暂护罩;附近每个中毒敌人多回 2%(各消耗一层毒)。',de:'Heal 20% over three seconds, cure bewitchment and gain a brief shield; +2% per poisoned enemy nearby (each loses a stack).'},
  numb:{g:'麻',zh:'麻沸散',en:'Anesthesia',col:'#dcb0ff',cost:50,cd:18,d:'周围敌人昏睡 2.5 秒,其间受到伤害 +30%;已中毒的目标毒伤一次引爆。',de:'Everything nearby sleeps for 2.5 s and takes 30% more damage; poisoned targets have their poison detonated at once.'},
};
const SPELL_KEYS=['','1','2','3'];
const CLASSES={
  swordsman:{zh:'剑客',en:'Swordsman',g:'剑',col:'#9fe3f0',main:'sword',skills:['palm','array','talis','sunder'],hp:100,mana:100,regen:13,dmg:1,spd:1,d:'御剑远攻,攻守均衡。',de:'Ranged flying swords. Balanced attack and defence.'},
  taoist:{zh:'道士',en:'Taoist',g:'道',col:'#ffd27a',main:'charm',skills:['talis','bagua','ward','exorcise'],hp:90,mana:150,regen:19,dmg:.95,spd:1,d:'体弱而内力深厚,符咒法术繁多。',de:'Fragile, but deep qi reserves and plenty of talisman magic.'},
  blademaster:{zh:'刀客',en:'Blademaster',g:'刀',col:'#ff9c5a',main:'slash',skills:['whirl','leap','roar','frenzy'],hp:125,mana:80,regen:12,dmg:1.08,spd:1.06,d:'近身刀法,皮糙肉厚,伤害最高。',de:'Up-close blade work. Tough, fast and the hardest hitter.'},
  qin:{zh:'琴师',en:'Qin Master',g:'琴',col:'#8fe3ff',main:'wave',skills:['flow','ambush','guangling','exorcise'],hp:100,mana:130,regen:16,dmg:.9,spd:1.03,d:'以琴音御敌,减速与控场见长。',de:'Fights with music: slows, fields and crowd control.'},
  monk:{zh:'武僧',en:'Monk',g:'僧',col:'#f0b35a',main:'staff',skills:['tiger','vajra','zen','sarira'],hp:135,mana:90,regen:12,dmg:1,spd:1,d:'禅杖横扫,金刚不坏;越打越稳的近战。',de:'Staff sweeps and an unbreakable body: the steadiest melee hero.'},
  physician:{zh:'医师',en:'Physician',g:'医',col:'#9ff06a',main:'needle',skills:['gu','plague','rejuv','numb'],hp:85,mana:140,regen:18,dmg:.92,spd:1.05,d:'毒针叠伤,瘟疫蔓延;慢慢毒死一切。',de:'Stacking poison and spreading plague: everything dies slowly, then all at once.'},
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
  'acid+dark':['尸毒','Corpse Venom','中毒的敌人死亡时留下毒雾。','Poisoned enemies leave mist when they die.'],
};
const fusKey=(a,b)=>[a,b].sort().join('+');
const AUGS={
  burst:{g:'连',zh:'连击',en:'Double Strike',d:'每次施放连发两轮。',de:'Every cast fires twice in a row.',for:['sword','palm','talis','charm','slash','leap','roar','wave','ambush','sunder','exorcise','needle','gu','tiger','fist','staff']},
  split:{g:'裂',zh:'分光',en:'Split',d:'命中时分裂成两道。符咒则分裂成子符。',de:'Shots split on hit. Talismans drop sub-talismans.',for:['sword','palm','talis','charm','wave','ambush','needle','gu','pouch'],
    by:{sword:['飞剑命中后分出两柄子剑(各 60% 伤害)','Each sword splits into two on hit (60% damage each)'],palm:['掌风命中后分成两道(各 60%)','Palm gusts split in two on hit (60% each)'],talis:['天雷符落地后再落两张子符','Each talisman drops two smaller ones'],charm:['符咒命中后分出两张子符,继续追踪','Charms split into two homing sub-charms'],wave:['音波命中后分成两道(各 60%)','Waves split in two on hit (60% each)'],ambush:['埋伏的音刃分成两道','Ambush blades split in two'],needle:['毒针命中后再分出两枚子针,子针也叠毒','Needles split into two more on hit; they stack poison too'],gu:['蛊虫命中后分成两只,各自继续追踪叠毒','Each gu splits into two that keep homing and poisoning'],pouch:['药囊炸开时再抛出两个小囊,各留一片小毒雾','Pouches scatter two smaller ones, each leaving a little mist']}},
  giant:{g:'雄',zh:'雄浑',en:'Mighty',d:'更大,伤害 +30%,出手稍慢。',de:'Bigger, +30% damage, slightly slower.',for:['sword','palm','talis','array','charm','slash','whirl','leap','roar','bagua','wave','flow','ambush','guangling','sunder','exorcise','staff','tiger','sarira','zen','pouch','plague','numb','vajra']},
  extra:{g:'增',zh:'增阵',en:'Wider Array',d:'阵法多两件法器,转得更快。',de:'Two more pieces in the array, spinning faster.',for:['array','bagua']},
};
const PERKS=[
  {g:'锋',zh:'锋锐',en:'Keen Edge',d:'所有伤害 +12%',de:'All damage +12%',a:P=>P.dmg*=1.12},
  {g:'罩',zh:'金钟罩',en:'Iron Bell',d:'受到伤害 -12%(减伤上限 60%)',de:'Damage taken -12% (mitigation caps at 60%)',a:P=>P.def*=.88},
  {g:'轻',zh:'轻身',en:'Light Step',d:'移动速度 +10%',de:'Move speed +10%',a:P=>P.spd*=1.1},
  {g:'息',zh:'内息',en:'Inner Breath',d:'内力上限 +30,回复更快',de:'+30 max qi and faster qi regen',a:P=>{P.maxMana+=30;P.regen*=1.2;P.mana=Math.min(P.maxMana,P.mana+30)}},
  {g:'命',zh:'生息',en:'Vitality',d:'生命上限 +25,并回复 25',de:'Max HP +25, heal 25',a:P=>{P.maxHp+=25;P.hp=Math.min(P.maxHp,P.hp+25)}},
  {g:'摄',zh:'摄物',en:'Lodestone',d:'拾取范围 +40%',de:'Pickup range +40%',a:P=>P.mag*=1.4},
  {g:'疾',zh:'疾风',en:'Haste',d:'冷却时间 -10%',de:'Cooldowns -10%',a:P=>P.haste/=.9},
  {g:'杀',zh:'致命',en:'Deadly',d:'暴击率 +8%(双倍伤害;超过 100% 转为暴击伤害)',de:'+8% crit chance (double damage; past 100% it raises crit damage)',a:P=>P.crit+=.08},
];
const ETYPES={
  assassin:{hp:10,spd:66,dmg:6,r:5,xp:1,zh:'刺客',en:'assassin'},
  bandit:{hp:26,spd:33,dmg:9,r:6,xp:2,zh:'刀客',en:'bandit'},
  archer:{hp:20,spd:30,dmg:7,r:6,xp:3,shoot:1,zh:'弓手',en:'archer'},
  giant:{hp:140,spd:23,dmg:16,r:10,xp:8,zh:'铁甲力士',en:'iron giant'},
  brute:{hp:95,spd:26,dmg:14,r:9,xp:6,zh:'盾卫',en:'shield guard',mesh:'giant',sc:.78,tint:[.7,.85,1.25]},
  bomber:{hp:24,spd:28,dmg:7,r:6,xp:4,shoot:1,bomb:1,zh:'火药匪',en:'bomber',mesh:'archer',sc:1.05,tint:[1.5,.9,.5]},
  wraith:{hp:30,spd:58,dmg:9,r:6,xp:5,zh:'怨灵',en:'wraith',mesh:'assassin',sc:1.3,tint:[1.3,.6,1.9],ghost:1},
  firewisp:{hp:34,spd:46,dmg:10,r:6,xp:6,zh:'火煞',en:'fire wisp',mesh:'assassin',sc:1.2,tint:[2.2,.9,.3],ghost:1,burn:1},
  icesprite:{hp:40,spd:40,dmg:9,r:6,xp:6,zh:'冰魄',en:'ice sprite',mesh:'assassin',sc:1.2,tint:[.5,1.4,2.2],ghost:1,chill:1},
};
/* 克制 counters (tower-defence style): every monster has what it is weak to (×1.6, or ×2 for the big ones) and what it shrugs off (×0.5).
   cat = skill category (SKILL_CAT), el = element. Shown in the codex, on themed-wave banners and as 克/抗 marks on hits. */
const AFFINITY={
  assassin:{weak:{cat:'control'},resist:null,tip:['怕控制:减速、眩晕、音阵','weak to control: slows, stuns, fields']},
  bandit:{weak:{cat:'melee'},resist:null,tip:['怕近战横扫','weak to melee sweeps']},
  archer:{weak:{cat:'melee'},resist:{cat:'ranged'},tip:['怕近战,远程打它只有一半','weak to melee; ranged hits do half']},
  giant:{weak:{el:'acid'},resist:{el:'fire'},tip:['铁甲怕酸蚀,不怕火','armour corrodes under acid; fire does half']},
  brute:{weak:{el:'lightning'},resist:{cat:'ranged'},tip:['盾挡远程,雷电穿甲','shield blocks ranged; lightning pierces']},
  bomber:{weak:{cat:'ranged'},resist:{cat:'melee'},tip:['远程打掉它,近身会被炸','kill it at range; melee gets you blown up']},
  wraith:{weak:{cat:'heal'},resist:{auto:1},tip:['普攻只有一半,驱邪/禅定/回春类武学双倍','normal attacks do half; exorcism, zen and healing skills do double']},
  firewisp:{weak:{el:'ice'},resist:{el:'fire'},tip:['免疫火,怕冰','immune to fire, weak to ice']},
  icesprite:{weak:{el:'fire'},resist:{el:'ice'},tip:['免疫冰,怕火','immune to ice, weak to fire']},
  boss:null,statue:null,
};
const THEMES=[
  {type:'assassin',zh:'刺客潮',en:'Assassin surge',from:120},{type:'bandit',zh:'刀客潮',en:'Bandit surge',from:120},{type:'archer',zh:'箭雨',en:'Arrow storm',from:150},
  {type:'brute',zh:'盾阵',en:'Shield wall',from:200},{type:'bomber',zh:'火药队',en:'Powder squad',from:240},{type:'giant',zh:'铁甲阵',en:'Iron column',from:300},
  {type:'wraith',zh:'怨灵夜',en:'Wraith night',from:330},{type:'firewisp',zh:'火煞潮',en:'Fire wisps',from:360},{type:'icesprite',zh:'冰魄潮',en:'Ice sprites',from:360},
];
const BOSS_NAME=['血魔教主','Blood Demon Patriarch'];

/* ---------- skill trees (Diablo / Last Epoch style) ----------
   Generic node effects the simulation understands:
   dmg (+12%/rank), cd (-8%/rank), count (+1 projectile/piece), pierce (+1), size (+15%/rank),
   cost (-15% qi/rank), dur (+1s/rank), knock (+50%/rank), crit (+5%/rank), life (2% lifesteal/rank), chain (15%/rank chance to arc) */
const NODE_FX={dmg:.12,cd:.08,count:1,pierce:1,size:.15,cost:.15,dur:1,knock:.5,crit:.05,life:.02,chain:.15};
const NODE_EN={"总治疗 +5% 最大生命 / 级":"Total healing +5% of max HP / rank","每跳治疗 +30% / 级":"Each pulse heals +30% / rank","命中回复 2% 伤害 / 级":"Heal 2% of damage dealt / rank","每跳治疗 +100% / 级":"Each pulse heals +100% / rank","+1 目标 / 级":"+1 target / rank","反震伤害 +12% / 级":"Rebound damage +12% / rank","反震范围 +15% / 级":"Rebound radius +15% / rank","受击回复生命":"Heal when hit","落地有几率再扑一次":"Landing may trigger a second pounce","+1 舍利 / 级":"+1 sarira / rank","爆炸有几率引发连锁":"The burst may chain a second one","+1 针 / 级":"+1 needle / rank","中毒目标死亡时毒雾扩散":"Poisoned enemies leave mist when they die","+1 药囊 / 级":"+1 pouch / rank","毒雾有几率放出电弧":"Mist may discharge arcs","毒雾范围 +15% / 级":"Mist radius +15% / rank","+1 蛊虫 / 级":"+1 gu / rank","治疗时震伤周围 +12% / 级":"Healing also hurts nearby enemies, +12% / rank","昏睡目标受伤 +12% / 级":"Sleeping targets take +12% / rank","昏睡结束时有几率爆发":"Waking may trigger a burst","突刺有几率震出余波":"Thrusts may send an aftershock","+1 刀气 / 级": "+1 blade qi / rank", "+1 卦符 / 级": "+1 trigram / rank", "+1 掌风 / 级": "+1 palm wave / rank", "+1 波剑雨 / 级": "+1 sword-rain wave / rank", "+1 牵连目标 / 级": "+1 chained target / rank", "+1 符箓 / 级": "+1 talisman / rank", "+1 音波 / 级": "+1 wave / rank", "+1 飞剑 / 级": "+1 flying sword / rank", "+1 鼓波 / 级": "+1 drum ring / rank", "+2 方向 / 级": "+2 directions / rank", "一次掷出两符": "Throws two talismans at once", "伤害 +12% / 级": "Damage +12% / rank", "内力消耗 -15% / 级": "Qi cost -15% / rank", "冷却 -8% / 级": "Cooldown -8% / rank", "出刀 +8% / 级": "Draw speed +8% / rank", "出手 +8% / 级": "Attack speed +8% / rank", "击退 +50% / 级": "Knockback +50% / rank", "刀光 +15% / 级": "Arc length +15% / rank", "半径 +15% / 级": "Radius +15% / rank", "吸血更多": "Stronger lifesteal", "命中回复生命": "Hits heal you", "命中有几率引发剑气跳击": "Hits may chain sword qi to another enemy", "命中有几率引发电弧": "Hits may arc lightning", "回复更多": "Heals more", "射程 +15% / 级": "Range +15% / rank", "护罩 +1s / 级": "Shield +1 s / rank", "持续 +1s / 级": "Duration +1 s / rank", "挥速 +8% / 级": "Swing speed +8% / rank", "攻速 +8% / 级": "Attack speed +8% / rank", "暴击 +5% / 级": "Crit +5% / rank", "波及范围 +15% / 级": "Reach +15% / rank", "爆裂范围 +15% / 级": "Blast radius +15% / rank", "眩晕 +1s / 级": "Stun +1 s / rank", "穿透 +1 / 级": "Pierce +1 / rank", "突进留下伤敌残影": "The lunge leaves a damaging afterimage", "范围 +15% / 级": "Area +15% / rank", "蓄满时有几率引雷": "At full charge, may call lightning", "血战伤害 +12% / 级": "Frenzy damage +12% / rank", "震地有几率引发连锁震击": "Slams may chain a second quake", "震开伤害 +12% / 级": "Shockwave damage +12% / rank", "震开范围 +15% / 级": "Shockwave radius +15% / rank", "鞭速 +8% / 级": "Lash speed +8% / rank", "鼓波命中有几率震出余波": "Drum hits may ripple an aftershock", "鼓速 +8% / 级": "Beat speed +8% / rank"};
const N=(fx,zh,en,max,tier,d)=>({fx,zh,en,max,tier,d,de:NODE_EN[d]||d});
/* 特性 vs 升级: a trait changes HOW a skill plays (more projectiles, piercing, chain effects, lifesteal);
   plain numbers (damage, cooldown, range, cost, crit, duration, knockback) are not traits: they ride on the skill's level,
   one rank every LV_PER_RANK levels, and the level card shows them. */
const LV_PER_RANK=3;
function isTrait(n){return ['count','pierce','chain'].includes(n.fx)||(n.fx==='life'&&!/治疗/.test(n.d))}
const TREES={
  great:[N('dmg','沉重','Heft',3,1,'伤害 +12% / 级'),N('size','阔刃','Broad Blade',3,1,'范围 +15% / 级'),N('cd','挥洒','Fluid Swing',3,2,'挥速 +8% / 级'),N('knock','崩山','Avalanche',2,2,'击退 +50% / 级'),N('crit','断金','Steel Breaker',2,3,'暴击 +5% / 级'),N('chain','地裂','Fissure',2,3,'震地有几率引发连锁震击')],
  whisk:[N('dmg','拂劲','Lash Force',3,1,'伤害 +12% / 级'),N('cd','疾鞭','Quick Lash',3,1,'鞭速 +8% / 级'),N('size','长拂','Long Reach',2,2,'射程 +15% / 级'),N('count','牵丝','Silk Threads',2,2,'+1 牵连目标 / 级'),N('crit','点穴','Pressure Point',2,3,'暴击 +5% / 级'),N('chain','雷拂','Thunder Whisk',2,3,'蓄满时有几率引雷')],
  nodachi:[N('dmg','刀意','Blade Intent',3,1,'伤害 +12% / 级'),N('size','长光','Long Light',3,1,'刀光 +15% / 级'),N('cd','拔刀','Quick Draw',3,2,'出刀 +8% / 级'),N('knock','逆风','Headwind',2,2,'击退 +50% / 级'),N('crit','一闪','Flash',2,3,'暴击 +5% / 级'),N('chain','残影','Afterimage',2,3,'突进留下伤敌残影')],
  drum:[N('dmg','鼓劲','Drum Force',3,1,'伤害 +12% / 级'),N('size','远震','Far Tremor',3,1,'波及范围 +15% / 级'),N('cd','急鼓','Rapid Beat',3,2,'鼓速 +8% / 级'),N('knock','震退','Repulse',2,2,'击退 +50% / 级'),N('count','叠鼓','Double Beat',2,2,'+1 鼓波 / 级'),N('chain','裂地','Quake',2,3,'鼓波命中有几率震出余波')],
  sword:[N('count','剑影','Sword Shadows',3,1,'+1 飞剑 / 级'),N('dmg','锋锐','Keen Edge',3,1,'伤害 +12% / 级'),N('cd','疾射','Quick Draw',3,2,'出手 +8% / 级'),N('pierce','贯穿','Pierce',2,2,'穿透 +1 / 级'),N('crit','要害','Vital Strike',2,3,'暴击 +5% / 级'),N('chain','剑气纵横','Sword Qi',2,3,'命中有几率引发剑气跳击')],
  palm:[N('dmg','刚猛','Vigour',3,1,'伤害 +12% / 级'),N('count','掌影','Palm Shadows',2,1,'+1 掌风 / 级'),N('knock','排山','Mountain Push',2,2,'击退 +50% / 级'),N('cd','连环','Chained Palms',3,2,'冷却 -8% / 级'),N('cost','气沉','Deep Breath',2,3,'内力消耗 -15% / 级'),N('size','掌风如山','Gale Palm',2,3,'范围 +15% / 级')],
  array:[N('count','增剑','More Blades',3,1,'+1 飞剑 / 级'),N('dur','久持','Lasting',3,1,'持续 +1s / 级'),N('dmg','剑意','Sword Intent',3,2,'伤害 +12% / 级'),N('size','广阵','Wide Array',2,2,'半径 +15% / 级'),N('cd','周天','Circulation',2,3,'冷却 -8% / 级'),N('life','饮血','Blood Drinker',2,3,'命中回复 2% 伤害 / 级')],
  talis:[N('dmg','天威','Heaven\'s Wrath',3,1,'伤害 +12% / 级'),N('size','雷域','Thunder Field',3,1,'范围 +15% / 级'),N('cd','急召','Swift Call',3,2,'冷却 -8% / 级'),N('cost','省符','Thrifty',2,2,'内力消耗 -15% / 级'),N('count','双符','Twin Talismans',1,3,'一次掷出两符'),N('chain','雷霆万钧','Rolling Thunder',2,3,'命中有几率引发电弧')],
  charm:[N('count','分箓','Split Charm',3,1,'+1 符箓 / 级'),N('dmg','灵力','Spirit Power',3,1,'伤害 +12% / 级'),N('size','爆裂','Burst',3,2,'爆裂范围 +15% / 级'),N('cd','快诵','Fast Chant',3,2,'出手 +8% / 级'),N('chain','引雷','Call Lightning',2,3,'命中有几率引发电弧'),N('life','摄魂','Soul Drain',2,3,'命中回复 2% 伤害 / 级')],
  bagua:[N('count','增卦','More Trigrams',2,1,'+1 卦符 / 级'),N('dur','固阵','Steady Array',3,1,'持续 +1s / 级'),N('dmg','阵威','Array Might',3,2,'伤害 +12% / 级'),N('size','大阵','Grand Array',2,2,'半径 +15% / 级'),N('cd','轮转','Rotation',2,3,'冷却 -8% / 级'),N('knock','震退','Repel',2,3,'击退 +50% / 级')],
  ward:[N('dur','久护','Long Ward',3,1,'护罩 +1s / 级'),N('cost','静心','Calm Mind',2,1,'内力消耗 -15% / 级'),N('cd','常驻','Ever Ready',3,2,'冷却 -8% / 级'),N('size','广护','Wide Ward',2,2,'震开范围 +15% / 级'),N('dmg','反震','Backlash',3,3,'震开伤害 +12% / 级'),N('knock','逐邪','Banish',2,3,'击退 +50% / 级')],
  slash:[N('dmg','刀劲','Blade Force',3,1,'伤害 +12% / 级'),N('size','长刀','Long Reach',3,1,'范围 +15% / 级'),N('cd','快刀','Fast Blade',3,2,'攻速 +8% / 级'),N('count','刀影','Blade Shadows',2,2,'+1 刀气 / 级'),N('crit','断魂','Soul Cutter',2,3,'暴击 +5% / 级'),N('life','嗜血','Bloodthirst',2,3,'命中回复 2% 伤害 / 级')],
  whirl:[N('dur','久旋','Long Spin',3,1,'持续 +1s / 级'),N('dmg','旋劲','Spin Force',3,1,'伤害 +12% / 级'),N('size','广旋','Wide Spin',2,2,'半径 +15% / 级'),N('cost','顺气','Smooth Qi',2,2,'内力消耗 -15% / 级'),N('cd','不止','Relentless',2,3,'冷却 -8% / 级'),N('life','血旋','Blood Spin',2,3,'命中回复 2% 伤害 / 级')],
  leap:[N('dmg','重落','Heavy Landing',3,1,'伤害 +12% / 级'),N('size','地裂','Fissure',3,1,'范围 +15% / 级'),N('cd','再跃','Leap Again',3,2,'冷却 -8% / 级'),N('knock','震荡','Shockwave',2,2,'击退 +50% / 级'),N('cost','轻盈','Light Body',2,3,'内力消耗 -15% / 级'),N('crit','致命一跃','Deadly Leap',2,3,'暴击 +5% / 级')],
  sunder:[N('dmg','剑威','Sword Might',3,1,'伤害 +12% / 级'),N('size','剑域','Sword Field',3,1,'范围 +15% / 级'),N('cd','归心','Swift Return',3,2,'冷却 -8% / 级'),N('cost','御气','Qi Mastery',2,2,'内力消耗 -15% / 级'),N('count','剑雨','Sword Rain',2,3,'+1 波剑雨 / 级'),N('crit','诛心','Heart Piercer',2,3,'暴击 +5% / 级')],
  exorcise:[N('size','净域','Purified Ground',3,1,'范围 +15% / 级'),N('dmg','神罚','Divine Wrath',3,1,'伤害 +12% / 级'),N('cd','诵经','Chanting',3,2,'冷却 -8% / 级'),N('cost','清心','Clear Mind',2,2,'内力消耗 -15% / 级'),N('life','超度','Deliverance',2,3,'命中回复 2% 伤害 / 级'),N('knock','驱散','Dispel',2,3,'击退 +50% / 级')],
  frenzy:[N('dur','久战','Long Fight',3,1,'持续 +1s / 级'),N('dmg','嗜杀','Bloodlust',3,1,'血战伤害 +12% / 级'),N('cd','不死','Undying',3,2,'冷却 -8% / 级'),N('cost','怒气','Rage',2,2,'内力消耗 -15% / 级'),N('life','饮血','Blood Drinker',2,3,'吸血更多'),N('crit','狂暴','Berserk',2,3,'暴击 +5% / 级')],
  wave:[N('count','和弦','Chord',3,1,'+1 音波 / 级'),N('dmg','震音','Tremolo',3,1,'伤害 +12% / 级'),N('pierce','穿云','Cloud Piercer',2,2,'穿透 +1 / 级'),N('cd','急弦','Quick Strings',3,2,'出手 +8% / 级'),N('crit','裂石','Stone Splitter',2,3,'暴击 +5% / 级'),N('chain','惊雷','Thunder Note',2,3,'命中有几率引发电弧')],
  flow:[N('dur','长流','Long Flow',3,1,'持续 +1s / 级'),N('dmg','激流','Rapids',3,1,'伤害 +12% / 级'),N('size','广域','Wide Water',3,2,'范围 +15% / 级'),N('cd','连奏','Legato',3,2,'冷却 -8% / 级'),N('cost','静水','Still Water',2,3,'内力消耗 -15% / 级'),N('life','润泽','Nourish',2,3,'命中回复 2% 伤害 / 级')],
  ambush:[N('dmg','杀机','Killing Intent',3,1,'伤害 +12% / 级'),N('count','重围','Encirclement',2,1,'+2 方向 / 级'),N('pierce','贯阵','Break Ranks',2,2,'穿透 +1 / 级'),N('cd','急奏','Presto',3,2,'冷却 -8% / 级'),N('knock','震退','Repel',2,3,'击退 +50% / 级'),N('cost','省力','Economy',2,3,'内力消耗 -15% / 级')],
  guangling:[N('dur','余音','Lingering Note',3,1,'持续 +1s / 级'),N('dmg','绝响','Final Chord',3,1,'伤害 +12% / 级'),N('size','满座','Full House',2,2,'范围 +15% / 级'),N('cd','再奏','Encore',3,2,'冷却 -8% / 级'),N('life','养神','Restore',2,3,'每跳治疗 +100% / 级'),N('cost','静心','Calm',2,3,'内力消耗 -15% / 级')],
  staff:[N('dmg','沉杖','Heavy Staff',3,1,'伤害 +12% / 级'),N('size','长杖','Long Reach',3,1,'范围 +15% / 级'),N('cd','疾杖','Quick Staff',3,2,'挥速 +8% / 级'),N('knock','扫荡','Sweep',2,2,'击退 +50% / 级'),N('pierce','贯穿','Run Through',2,3,'穿透 +1 / 级'),N('chain','震地','Earth Strike',2,3,'突刺有几率震出余波')],
  fist:[N('dmg','铁拳','Iron Fist',3,1,'伤害 +12% / 级'),N('cd','连环','Flurry',3,1,'出拳 +8% / 级'),N('count','双打','Twin Strike',2,2,'+1 目标 / 级'),N('knock','崩拳','Crushing Palm',2,2,'击退 +50% / 级'),N('crit','点穴','Pressure Point',2,3,'暴击 +5% / 级'),N('life','吸功','Qi Drain',2,3,'命中回复 2% 伤害 / 级')],
  vajra:[N('dur','久持','Lasting',2,1,'持续 +1s / 级'),N('cost','清心','Clear Mind',2,1,'内力消耗 -15% / 级'),N('cd','金身','Golden Body',3,2,'冷却 -8% / 级'),N('dmg','反震','Rebound',3,2,'反震伤害 +12% / 级'),N('size','护法','Guardian',2,3,'反震范围 +15% / 级'),N('life','不坏','Indestructible',2,3,'受击回复生命')],
  tiger:[N('dmg','虎威','Tiger Might',3,1,'伤害 +12% / 级'),N('size','虎啸','Tiger Roar',3,1,'范围 +15% / 级'),N('cd','疾扑','Quick Pounce',3,2,'冷却 -8% / 级'),N('dur','镇压','Pin Down',2,2,'眩晕 +1s / 级'),N('cost','省力','Economy',2,3,'内力消耗 -15% / 级'),N('chain','连扑','Double Pounce',2,3,'落地有几率再扑一次')],
  zen:[N('dur','深定','Deep Stillness',2,1,'持续 +1s / 级'),N('cd','顿悟','Insight',3,1,'冷却 -8% / 级'),N('size','佛光','Radiance',3,2,'震开范围 +15% / 级'),N('life','回春','Renewal',2,2,'每跳治疗 +30% / 级'),N('knock','怒目','Wrathful Gaze',2,3,'击退 +50% / 级'),N('dmg','狮吼','Lion Pulse',2,3,'震开伤害 +12% / 级')],
  sarira:[N('dmg','金光','Golden Light',3,1,'伤害 +12% / 级'),N('size','大圆','Great Circle',3,1,'范围 +15% / 级'),N('dur','长转','Long Spiral',2,2,'持续 +1s / 级'),N('count','双舍利','Twin Sarira',2,2,'+1 舍利 / 级'),N('cd','顿悟','Insight',2,3,'冷却 -8% / 级'),N('chain','涅槃','Nirvana',2,3,'爆炸有几率引发连锁')],
  needle:[N('dmg','淬毒','Steeped',3,1,'伤害 +12% / 级'),N('count','连珠','Volley',3,1,'+1 针 / 级'),N('cd','快手','Quick Hands',3,2,'出手 +8% / 级'),N('pierce','透骨','Bone Piercer',2,2,'穿透 +1 / 级'),N('crit','要穴','Vital Point',2,3,'暴击 +5% / 级'),N('chain','毒发','Venom Burst',2,3,'中毒目标死亡时毒雾扩散')],
  pouch:[N('dmg','浓毒','Potent',3,1,'伤害 +12% / 级'),N('size','广布','Wide Mist',3,1,'范围 +15% / 级'),N('dur','久雾','Lingering',2,2,'持续 +1s / 级'),N('cd','快掷','Quick Throw',3,2,'出手 +8% / 级'),N('count','双囊','Twin Pouch',2,3,'+1 药囊 / 级'),N('chain','雷毒','Thunder Venom',2,3,'毒雾有几率放出电弧')],
  plague:[N('dmg','恶疾','Wasting',3,1,'伤害 +12% / 级'),N('count','蔓延','Spread',2,1,'+2 目标 / 级'),N('dur','缠绵','Lingering',2,2,'持续 +1s / 级'),N('cd','急症','Acute',3,2,'冷却 -8% / 级'),N('size','疫区','Outbreak',2,3,'毒雾范围 +15% / 级'),N('cost','省药','Frugal',2,3,'内力消耗 -15% / 级')],
  gu:[N('dmg','毒牙','Venom Fang',3,1,'伤害 +12% / 级'),N('count','群蛊','Swarm',3,1,'+1 蛊虫 / 级'),N('pierce','钻心','Burrow',2,2,'穿透 +1 / 级'),N('cd','催蛊','Hasten',3,2,'冷却 -8% / 级'),N('size','肥蛊','Fat Gu',2,3,'范围 +15% / 级'),N('life','食血','Blood Feast',2,3,'吸血更多')],
  rejuv:[N('life','厚药','Strong Dose',3,1,'总治疗 +5% 最大生命 / 级'),N('dur','久效','Long Effect',2,1,'护罩 +1s / 级'),N('cd','妙手','Deft Hands',3,2,'冷却 -8% / 级'),N('cost','省药','Frugal',2,2,'内力消耗 -15% / 级'),N('size','药香','Herbal Aura',2,3,'波及范围 +15% / 级'),N('dmg','以毒攻毒','Fight Poison',2,3,'治疗时震伤周围 +12% / 级')],
  numb:[N('dur','深眠','Deep Sleep',2,1,'眩晕 +1s / 级'),N('size','弥漫','Diffuse',3,1,'范围 +15% / 级'),N('cd','速效','Fast Acting',3,2,'冷却 -8% / 级'),N('dmg','重创','Exploit',3,2,'昏睡目标受伤 +12% / 级'),N('cost','省药','Frugal',2,3,'内力消耗 -15% / 级'),N('chain','惊醒','Rude Awakening',2,3,'昏睡结束时有几率爆发')],
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
  snow:{zh:'雪岭关',en:'Snow Pass',need:'boss2',bright:1,sunI:.72,base:'#c9d6dc',blobs:['#dfe8ec','#b8c8d0','#e8eef1','#a9bcc6','#d2dde2','#98aab4','#c3b9a8','#b0c4cc'],grain:['#e9f0f3','#a9bcc6','#d7e0e4','#8fa3ad','#f4f7f8','#b9b0a0'],trail:['#6a6058','#8d8278','#a69a8c'],plaza:'#4a4e52',fog:'#b9c9d2',sun:'#ffe4c8',hemi:['#cfe0ff','#6a7a84'],water:[[.05,.14,.2],[.72,.84,.92]],pine:['#2b4a3e','#e9f1f3'],bamboo:['#8a9a7a','#dfe8e2'],grassTips:['#dfe8ec','#b9c8cc','#e8e2cf'],grassRoot:'#7a8a8a',maple:[['#5a3a2e','#e9f1f3'],['#6a4a36','#f3f6f7']],lantern:'#ffb04a',edge:'60,74,86'},
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
const WEAPONS={swordsman:['sword','great'],taoist:['charm','whisk'],blademaster:['slash','nodachi'],qin:['wave','drum'],monk:['staff','fist'],physician:['needle','pouch']};
const WEAPON_INFO={
  sword:{trait:['快而多','Fast, many blades'],awake:['剑雨·飞剑数 +2,伤害 +25%','Sword Rain: +2 blades, +25% damage']},
  great:{need:'clsboss',cost:500,trait:['重击·震地','Heavy hits, ground slam'],awake:['开山·每第二击震地,震地范围 +40%','Mountain Splitter: slam every second swing, +40% slam radius']},
  charm:{trait:['追踪·爆裂','Homing, explodes'],awake:['万符·符数 +2,爆炸范围 +30%','Myriad Charms: +2 charms, +30% blast radius']},
  whisk:{need:'clsboss',cost:500,trait:['持续·蓄力','Sustained, ramps up'],awake:['三清·牵连三名敌人,蓄力上限 +60%','Three Pure Ones: chains to three enemies, ramp cap doubled']},
  slash:{trait:['贯穿·扇形','Piercing fan'],awake:['刀海·刀气 +3,范围 +25%','Sea of Blades: +3 blade qi, +25% reach']},
  nodachi:{need:'clsboss',cost:500,trait:['突进·长刀光','Lunge, long arc'],awake:['居合·突进更远,刀光留下灼痕','Iaido: longer lunge, the arc leaves a burning trail']},
  wave:{trait:['穿透·减速','Pierces, slows'],awake:['裂帛·音波 +2,穿透 +2','Rending Note: +2 waves, +2 pierce']},
  drum:{need:'clsboss',cost:500,trait:['环形冲击·击退','Ring shockwave, knockback'],awake:['雷鼓·双重鼓波,范围 +30%','Thunder Drum: double ring, +30% radius']},
  staff:{trait:['四周横扫·突刺','All-round sweep, thrust'],awake:['降魔·每第二击突刺,范围 +25%','Demon Subduer: thrust every second strike, +25% reach']},
  fist:{need:'clsboss',cost:500,trait:['单体快拳·震掌','Rapid single-target, palm blast'],awake:['百步神拳·每第三拳震掌,伤害 +25%','Hundred-Step Fist: palm blast every third punch, +25% damage']},
  needle:{trait:['叠毒·远程','Stacking poison, ranged'],awake:['七星针·针数 +2,毒伤翻倍','Seven-Star Needles: +2 needles, double poison']},
  pouch:{need:'clsboss',cost:500,trait:['毒雾·范围','Poison mist, area'],awake:['百毒囊·双囊齐发,毒雾 +40%','Hundred-Venom Pouch: throws two, +40% mist']},
};
const AWAKE_LV=15;
/* skill categories for the card screen */
const CATS={melee:['近战','Melee','#ff9c5a'],ranged:['远程','Ranged','#9fe3f0'],summon:['阵法','Summon','#c7a4f0'],defense:['防御','Defense','#7dffb0'],heal:['治疗','Heal','#7fc98a'],control:['控制','Control','#ffd75a'],element:['真气','Element','#ff8a3c'],augment:['强化','Augment','#d6a54a'],passive:['心法','Passive','#efe4cd'],all:['全体攻击','All attacks','#ffd27a'],tree:['武学树','Tree','#ffd27a'],new:['新武学','New skill','#ffffff']};
/* card kinds: each has its own colour, glyph and a one-line hint so the four common kinds read at a glance
   升级 blue ↑ · 武学树 gold ⟡ · 心法 ivory 卷 · 新武学 green ✦ */
/* weapon paths: one early choice that changes how the normal attack plays, each with a real cost */
const PATHS={
  wide:{zh:'大开大合',en:'Sweeping',d:'范围 +35%,击退 +30%;攻速 -18%',de:'+35% area, +30% knockback; -18% attack speed',size:1.35,knock:1.3,cd:1.22,m:1},
  swift:{zh:'疾风连击',en:'Flurry',d:'攻速 +30%;范围 -12%,伤害 -8%',de:'+30% attack speed; -12% area, -8% damage',size:.88,knock:1,cd:.77,m:.92},
  heavy:{zh:'一击必杀',en:'Heavy Hand',d:'伤害 +30%,暴击 +10%;攻速 -22%',de:'+30% damage, +10% crit; -22% attack speed',size:1,knock:1.15,cd:1.28,m:1.3,crit:.1},
};
const KINDS={path:['流派','Path','#ff9c5a','派'],level:['升级','Level up','#4fa3ff','↑'],new:['新武学','New skill','#7dffb0','✦'],element:['灌注真气','Element','#ff8a3c','炁'],fusion:['真气融合','Fusion','#c7a4f0','合'],tree:['特性','Trait','#ffd27a','⟡'],augment:['强化','Augment','#d6a54a','强'],passive:['心法','Passive','#efe4cd','卷'],awake:['武器觉醒','Awakening','#ffe9a0','觉'],contract:['契约','Pact','#ff6a6a','契'],ascend:['进化','Evolve','#ffd27a','劫'],jackpot:['天降横财','Jackpot','#ff9fd0','囍']};
const KIND_HINT={path:['决定普攻的打法,一局一次,有得有失','Sets how your normal attack plays, once per run, with a trade-off'],level:['数值变强','Bigger numbers'],new:['学一门新武学,占一个空位','Learn a new skill into an empty slot'],tree:['改变打法','New way to play'],passive:['被动心法:对所有武学生效','A passive: applies to every skill'],element:['给这门武学附上真气效果','Adds an element effect to this skill'],fusion:['两种真气融合成新效果','Two elements fuse into a new effect'],augment:['改变这门武学的施放方式','Changes how this skill fires'],awake:['武器质变,一局一次','The weapon transforms, once per run'],contract:['付出代价,换取当下的力量','Pay a price for power now'],ascend:['一轮七首领已灭:改写规则继续,或照旧','Seven bosses down: rewrite the rules, or carry on as is'],jackpot:['三张全拿','Take all three']};
const SKILL_CAT={great:'melee',whisk:'ranged',nodachi:'melee',drum:'control',sword:'ranged',palm:'ranged',array:'summon',talis:'ranged',charm:'ranged',bagua:'summon',ward:'defense',slash:'melee',whirl:'melee',leap:'melee',roar:'control',sunder:'ranged',exorcise:'control',frenzy:'melee',wave:'ranged',flow:'control',ambush:'ranged',guangling:'heal',staff:'melee',fist:'melee',vajra:'defense',tiger:'melee',zen:'heal',sarira:'ranged',needle:'ranged',pouch:'ranged',plague:'control',gu:'ranged',rejuv:'heal',numb:'control'};
const PERK_CAT={锋锐:'all',金钟罩:'defense',轻身:'passive',内息:'passive',生息:'heal',摄物:'passive',疾风:'passive',致命:'all'};
/* boss signature moves, by boss index (see BOSSES in sim.js) */
const BOSS_SIG=[['bloodrain','drain'],['spiral','blink'],['eggs','venom'],['bonewall','spikes'],['hellring','meteor'],['mirror','bewitch'],['phalanx','cannon']];
const BOSS_HINT=[['血雨落处勿站,他吸血时拉开距离','Step out of the blood rain; back away when he drains'],['刀影螺旋有缝,他消失时准备闪避','The blade spiral has gaps; dash when he vanishes'],['蛊卵孵化前踩灭,远离毒雾','Stamp the eggs before they hatch; avoid the poison'],['骨墙缓慢,轻功穿过;脚下骨刺看地面','Dash through the bone walls; watch the ground for spikes'],['火环留一缺口,陨星落点必须离开','The fire ring leaves one gap; leave the meteor mark'],['幻影一击即碎,粉色波纹碰到会颠倒方向','Illusions shatter in one hit; the pink ring reverses your controls'],['盾墙挡路绕开,炮击落在你站过的地方','Go around the shield wall; the volleys land where you stood']];
/* PK mode: point values, last hit takes all */
const PK_LEN=600;
const PTS={assassin:1,bandit:2,archer:3,giant:8,brute:5,bomber:4,wraith:4,statue:0};
function pts(e){if(e.type==='boss')return 300+150*(e.n||0);if(e.warlord)return 60;let p=PTS[e.type]||1;if(e.elite)p*=3;if(e.role)p*=2;if(e.affix)p=Math.round(p*1.5);return p}
const PK_EVENTS={chest:25,mission:40,ambush:50};
const ACTIVE_MULT=2.6;  // damage multiplier for qi-costing skills (see hit())

/* 修罗 Ascension tiers: stacked modifiers, unlocked by clearing the previous tier (two bosses in one run) */
const ASURA=[
  {zh:'敌人生命 +15%',en:'Enemies +15% HP'},
  {zh:'精英更常出现',en:'Elites appear more often'},
  {zh:'首领从第一位起就会放出波纹',en:'Bosses use the nova from the first one on'},
  {zh:'词缀敌人从 2:00 起出现',en:'Affixed enemies from 2:00'},
  {zh:'生命上限 -15%',en:'Max HP -15%'},
  {zh:'首领伤害 +25%',en:'Boss damage +25%'},
  {zh:'铁甲统领成对出现',en:'The Iron Warlord comes in pairs'},
  {zh:'重抽次数减半',en:'Half as many rerolls'},
  {zh:'怪潮 +25%',en:'Spawns +25%'},
  {zh:'首领生命 +30%',en:'Bosses +30% HP'},
];
const ASURA_GOLD=.15; // gold multiplier per tier
/* cursed relics: strong, with a price */
Object.assign(RELICS,{
  bloodcurse:{g:'煞',zh:'血煞',en:'Blood Curse',d:'伤害 +35%,生命上限 -25%',de:'+35% damage, -25% max HP',col:'#ff3a3a',cursed:1},
  glass:{g:'琉',zh:'琉璃心',en:'Glass Heart',d:'暴击 +25%,受到伤害 +20%',de:'+25% crit, +20% damage taken',col:'#9fe3f0',cursed:1},
  wolf:{g:'狼',zh:'贪狼',en:'Greedy Wolf',d:'金币 +60%,拾取范围 -30%',de:'+60% gold, -30% pickup range',col:'#ffd27a',cursed:1},
  bind:{g:'缚',zh:'缚灵',en:'Soul Bind',d:'武学内力消耗 -40%,移速 -10%',de:'Skills cost 40% less qi, -10% speed',col:'#b57cf0',cursed:1},
});
/* contracts: an in-run bargain - take a curse for the rest of the run, get something big now */
const CONTRACTS=[
  {id:'swift',zh:'疾风契',en:'Pact of Wind',cost:['敌人移速 +20%','Enemies +20% speed'],gain:['立即获得一件法宝','A relic right now'],apply(){G.curse.spd=1.2},reward(){dropRelic(G.P.x+30,G.P.y)}},
  {id:'horde',zh:'群魔契',en:'Pact of Hordes',cost:['怪潮 +30%','Spawns +30%'],gain:['一张传说卡','A legendary card'],apply(){G.curse.spawn=1.3},reward(){G.picks.unshift({kind:'level',forceQ:'legendary'})}},
  {id:'thin',zh:'薄命契',en:'Pact of Thin Blood',cost:['生命上限 -20%','Max HP -20%'],gain:['伤害 +20%(本局)','+20% damage this run'],apply(){G.P.maxHp=Math.round(G.P.maxHp*.8);G.P.hp=Math.min(G.P.hp,G.P.maxHp);G.P.dmgBonus+=.2},reward(){}},
  {id:'greed',zh:'贪婪契',en:'Pact of Greed',cost:['不再掉落宝箱','No more chests'],gain:['金币 +200 并 +50% 金币','+200 gold now and +50% gold'],apply(){G.curse.nochest=1;G.goldRun+=200;G.curse.gold=1.5},reward(){}},
  {id:'hunted',zh:'猎命契',en:'Pact of the Hunted',cost:['铁甲统领立刻出现','The Iron Warlord arrives now'],gain:['三次重抽','Three rerolls'],apply(){G.warlordNow=1},reward(){G.rerolls+=3}},
];

/* codex: what the player has met */
const CODEX_ENEMIES=[
  {id:'firewisp',g:'煞',zh:'火煞',en:'Fire Wisp',d:'燃着的游魂,碰到就着火;免疫火,怕冰。',de:'A burning spirit that sets you alight; immune to fire, weak to ice.'},
  {id:'icesprite',g:'魄',zh:'冰魄',en:'Ice Sprite',d:'寒气逼人,碰到就减速;免疫冰,怕火。',de:'A freezing spirit that chills on touch; immune to ice, weak to fire.'},
  {id:'assassin',g:'刺',zh:'刺客',en:'Assassin',d:'快而脆,成群扑来。',de:'Fast and fragile; comes in packs.'},
  {id:'bandit',g:'匪',zh:'刀客',en:'Bandit',d:'中等体型的近战,数量是关键。',de:'Mid-weight melee; numbers are the threat.'},
  {id:'archer',g:'弓',zh:'弓手',en:'Archer',d:'保持距离放箭,箭可以被轻功躲开。',de:'Keeps its distance and shoots; arrows can be dashed through.'},
  {id:'giant',g:'力',zh:'铁甲力士',en:'Iron Giant',d:'厚血慢步,击退它需要重武器。',de:'Thick HP, slow; heavy weapons move it.'},
  {id:'brute',g:'盾',zh:'盾卫',en:'Shield Guard',d:'正面持盾,正面受到的伤害 -70%;绕到背后或用范围技。',de:'Carries a shield: frontal hits do 70% less; flank it or use area skills.'},
  {id:'bomber',g:'药',zh:'火药匪',en:'Bomber',d:'向你脚下投掷炸药,落点有红圈提示。',de:'Lobs powder bombs at your feet; the landing spot shows a red ring.'},
  {id:'wraith',g:'怨',zh:'怨灵',en:'Wraith',d:'穿墙而来,普攻只造成一半伤害,武学造成双倍。',de:'Passes through walls; normal attacks do half damage, skills do double.'},
  {id:'charger',g:'冲',zh:'冲锋刀客',en:'Charging Bandit',d:'蓄力后沿红线冲撞,侧身躲开。',de:'Winds up, then charges along the red line; step aside.'},
  {id:'shaman',g:'巫',zh:'巫弓手',en:'Shaman Archer',d:'绿色光环为周围敌人回血,普攻会优先瞄准它。',de:'Green aura heals nearby enemies; auto-attacks target it first.'},
  {id:'swift',g:'疾',zh:'疾风',en:'Swift',d:'词缀:移速 +50%。',de:'Affix: +50% speed.'},
  {id:'explode',g:'爆',zh:'爆裂',en:'Exploding',d:'词缀:死亡时爆炸,别站在尸体旁。',de:'Affix: explodes on death; don\'t stand by the corpse.'},
  {id:'armor',g:'甲',zh:'重甲',en:'Armoured',d:'词缀:生命 +80%。',de:'Affix: +80% HP.'},
  {id:'elite',g:'精',zh:'精英',en:'Elite',d:'五倍生命,30% 几率掉落法宝。',de:'Five times the HP; 30% chance to drop a relic.'},
  {id:'warlord',g:'统',zh:'铁甲统领',en:'Iron Warlord',d:'每个周期 2:00 出现,必掉法宝与宝箱。',de:'Arrives at 2:00 of each cycle; always drops a relic and a chest.'},
  {id:'illusion',g:'幻',zh:'幻影',en:'Illusion',d:'千面妖姬的分身,一击即碎。',de:'The Enchantress\'s copies; shatter in one hit.'},
];
