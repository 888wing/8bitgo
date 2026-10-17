// 福安樓縱火案：原型只包含序幕和第一、二天。
// 格式見 docs/05-production.md；完整案件見 docs/04-case.md。

export const SEATS = [
  { id: 'leung', seat: 1, name: '梁守仁', short: '梁', call: '梁伯', role: '主席，退休文員' },
  { id: 'wong', seat: 2, name: '黃大有', short: '黃', call: '黃老闆', role: '茶餐廳老闆' },
  { id: 'law', seat: 3, name: '羅永昌', short: '羅', call: '羅生', role: '倉務主管' },
  { id: 'lam', seat: 4, name: '林曉晴', short: '林', call: '林小姐', role: '大學生' },
  { id: 'so', seat: 5, name: '蘇美玲', short: '蘇', call: '蘇太', role: '家庭主婦' },
  { id: 'fung', seat: 6, name: '馮國強', short: '馮', call: '馮 Sir', role: '退休消防隊長' },
  { id: 'you', seat: 7, name: '你', short: '你', call: '你', role: '當舖朝奉' },
];

export const AI_IDS = SEATS.filter((s) => s.id !== 'you').map((s) => s.id);

// 控方的證據鏈。必要的環任何一個存疑，一般陪審員就投無罪。
export const LINKS = [
  { id: 'presence', name: '在場', required: true },
  { id: 'ignition', name: '起火', required: true },
  { id: 'means', name: '手段', required: false },
  { id: 'motive', name: '動機', required: false },
  { id: 'confession', name: '口供', required: false },
];

export const CLAIMS = {
  c1: { witness: 'cheng', link: 'ignition', text: '起火點在三樓樓梯', label: '鄭① 起火點在三樓' },
  c2: { witness: 'cheng', link: 'ignition', text: '打火機在起火點找到，刻著「樂」字', label: '鄭② 起火點的打火機' },
  c3: { witness: 'cheng', link: 'confession', text: '被告簽署口供，承認放火', label: '鄭③ 口供' },
  g1: { witness: 'chung', link: 'presence', text: '兩點見到被告在樓梯', label: '鍾① 兩點見到被告' },
  g2: { witness: 'chung', link: null, text: '當時在更亭看電視', label: '鍾② 在更亭看電視' },
  g3: { witness: 'chung', link: 'presence', text: '燈光下看得好清楚', label: '鍾③ 燈光下看清楚' },
  w1: { witness: 'wat', link: 'motive', text: '被告揚言「一把火燒咗佢」', label: '屈① 揚言放火' },
  w2: { witness: 'wat', link: null, text: '拉扯時，被告的東西跌滿地', label: '屈② 東西跌滿地' },
  h1: { witness: 'wat', link: 'motive', text: '街坊說，鄺婆婆很怕被告', label: '屈：街坊傳聞' },
  k1: { witness: 'chan', link: 'means', text: '火災前那個下午，被告買了兩公升火水', label: '陳① 買了火水' },
};

export const EXHIBITS = {
  P1: {
    code: 'P1', name: '樓梯現場相片', text: '三樓樓梯燒得一片黑。',
    details: [
      { id: 'P1a', text: '三樓樓梯的牆，燒得最黑。' },
      { id: 'P1b', text: '相片右下角拍到地下寫字樓的門，門腳好像也有一道黑痕。', zoom: true },
    ],
  },
  P2: {
    code: 'P2', name: '打火機', text: '一個銀色火水打火機，封在證物袋裡。',
    details: [
      { id: 'P2a', text: '機身刻著一個「樂」字。' },
      {
        id: 'P2b', text: '火石磨平了，棉芯是乾的。', zoom: true,
        eye: '做當舖嘅都知：火石磨成咁、棉芯乾成咁，呢個火機好耐冇著過。',
      },
    ],
  },
  P4: {
    code: 'P4', name: '口供', text: '打字的口供，被告在下面簽了名。',
    details: [
      { id: 'P4a', text: '正文：「本人承認於福安樓放火。」' },
      { id: 'P4b', text: '頁底有一行歪斜的手寫字：「我只係喺地下點過張紙」。', zoom: true },
    ],
  },
  D1: {
    code: 'D1', name: '截電通知', text: '辯方證物：電力公司的通知書。',
    details: [
      { id: 'D1a', text: '日期：一九八七年十月廿五日。' },
      { id: 'D1b', text: '「應業主要求，暫停福安樓全幢供電，直至另行通知。」' },
    ],
  },
  P3: {
    code: 'P3', name: '火水單據', text: '五金舖的手寫單據。',
    details: [{ id: 'P3a', text: '十一月二日，火水兩公升。' }],
  },
};

// 理由：說法 × 證物（或另一個說法）。card 是在評議室出示時推出去的那件東西。
// note 是完整的想法；jot 是寫在筆記本頁邊的短句（桌面版，一行寫得下）。
export const REASONS = {
  R1: {
    card: 'P4', claims: ['c3'], effect: 'doubt', pairs: [['c3', 'P4b'], ['c1', 'P4b']],
    note: '佢話喺地下點過張紙，督察話起火點喺三樓？', jot: '佢只係喺地下點過紙？',
  },
  R2: {
    card: 'P2', claims: ['c2'], effect: 'doubt', pairs: [['c2', 'P2b']],
    note: '火石磨平、棉芯乾：呢個火機，點著火？', jot: '火石平、棉芯乾，點著？',
  },
  RB: {
    card: 'P1', claims: ['c1'], effect: 'doubt', from: 'fung',
    note: '馮 Sir：燒痕由下面燒上嚟，起火點未必喺三樓。', jot: '燒痕由下面燒上嚟',
  },
  R3: {
    card: 'D1', claims: ['g2'], effect: 'doubt', pairs: [['g2', 'D1b'], ['g2', 'D1a']],
    note: '成幢樓冇電，點睇電視？', jot: '冇電，點睇電視？',
  },
  R4: {
    card: 'D1', claims: ['g3'], effect: 'doubt', pairs: [['g3', 'D1b'], ['g3', 'D1a']],
    note: '冇電，樓梯點會有燈？', jot: '冇電，點會有燈？',
  },
  R5: {
    card: 'D1', claims: ['k1'], effect: 'doubt', pairs: [['k1', 'D1b'], ['k1', 'D1a']],
    note: '冇電又天凍，買火水可能係攞嚟取暖、點燈。', jot: '冇電天凍，火水取暖？',
  },
  R6: {
    card: 'P3', claims: ['w1', 'k1'], effect: 'trust', pairs: [['w1', 'k1'], ['w1', 'P3a']], from: 'wong',
    note: '一個禮拜前講要燒，燒之前一日就去買火水。', jot: '講完要燒，就買火水',
  },
};

export const CARD_NAMES = { P4: '口供頁底的手寫字', P2: '打火機', P1: '樓梯相片', D1: '截電通知', P3: '火水單據' };

// 對得上，但你看不懂：視角的限制。
export const THOUGHTS = [
  { pair: ['c1', 'P1b'], text: '地下門腳都有黑痕……不過你唔識睇燒痕。', jot: '地下門腳都有黑痕？' },
];

const every = (value) => Object.fromEntries(Object.keys(CLAIMS).map((id) => [id, value]));

// initial：聽到說法時的預設印章。accepts：哪些理由說得動他。locks：翻不動的格子，值是撬得開它的理由。
export const JURORS = {
  leung: {
    initial: every('trust'),
    accepts: ['R1', 'R3', 'R4', 'RB', 'R6'],
    locks: { c3: ['R1'] },
    ask: '我信督察。文件上寫乜，我就信乜。',
    contagion: '一個講兩次大話嘅人，佢其他說話我都唔敢信。',
    swayed: '……不過羅生都話佢好老實。',
  },
  wong: {
    initial: every('trust'),
    accepts: ['R5', 'R6'],
    locks: { c2: [], w1: [] },
    rule: 'motiveEnough',
    vote: 'impatient',
    ask: '我做咗廿年生意，咩人我一眼睇得穿。',
    swayed: '人哋都話佢老實啦。',
  },
  law: {
    initial: every('trust'),
    accepts: [],
    locks: every([]),
    vote: 'guilty',
    ask: '……我冇咩好講。',
  },
  lam: {
    initial: { c1: 'doubt', c2: 'doubt', c3: 'doubt', g1: 'doubt', g2: null, g3: null, w1: 'doubt', w2: 'trust', h1: null, k1: 'trust' },
    accepts: ['R1', 'R2', 'R3', 'R4', 'R5', 'RB'],
    locks: { c3: [] },
    ask: '督察、看更、代理人，我一個都唔信。',
    contagion: '佢講過兩次大話，其他嘢都唔使信。',
  },
  so: {
    initial: every('trust'),
    accepts: ['R5', 'R6'],
    locks: { w1: [] },
    conformist: true,
    ask: '大家點睇，我……我都差唔多。',
    swayed: '羅生都咁講……',
  },
  fung: {
    initial: { c1: 'doubt', c2: 'trust', c3: null, g1: null, g2: null, g3: null, w1: null, w2: null, h1: null, k1: 'trust' },
    accepts: ['R2', 'R3', 'R4'],
    leansIn: ['R2', 'R3', 'R4'],
    gives: 'RB',
    ask: '你睇呢張相：三樓樓梯嘅燒痕，係由下面燒上嚟嘅。起火點，未必喺三樓。',
    askAgain: '我講過喇：證物先算。',
    contagion: '證物同佢講嘅對唔上，佢其他說話我都唔信。',
  },
};

// 評議室的反應。flip：改了印章；agree：本來就同意；reject：說不動；swayed：被別人的話拉住了。
export const REACTIONS = {
  leung: {
    P4: { flip: '（推一推眼鏡）地下……同起火點唔同。份口供，我收返。' },
    P2: { reject: '火機乾咗，都唔代表當晚冇用過。' },
    P1: { flip: '馮 Sir 係專家……火由下面燒上嚟，起火點就未必喺三樓。' },
    D1: { flip: '冇電……咁佢點睇電視？樓梯又點會有燈？' },
    default: { flip: '……咁講都有道理。', agree: '我都係咁睇。', reject: '咁都唔代表乜嘢。' },
  },
  wong: {
    P2: { reject: '乾咗都可以係之後先乾㗎。' },
    P4: { reject: '手寫嗰兩句，邊個知係咪佢寫㗎？' },
    P1: { reject: '專家都會睇錯。' },
    D1: { reject: '冇電都可以用電芯電視㗎。', flip: '冇電都可以用電芯電視㗎。……火水就算啦，成條街都買。' },
    default: { flip: '……算你啦。', agree: '係囉。', reject: '唔好再拖啦。' },
  },
  law: { default: { flip: '……', agree: '……', reject: '……' } },
  lam: {
    P4: { agree: '我一早就話份口供有問題。' },
    P1: { flip: '連起火點都未必啱？', agree: '連起火點都未必啱。' },
    D1: { flip: '我就話個看更有古怪。', agree: '我就話個看更有古怪。' },
    P3: { reject: '講吓啫，唔代表佢做。' },
    default: { flip: '我都係咁諗。', agree: '我都係咁諗。', reject: '我唔係咁睇。' },
  },
  so: {
    D1: { flip: '天咁凍……婆婆又冇電……', reject: '我唔知……三條人命呀。' },
    default: { flip: '如果係咁……', agree: '係囉……', reject: '我唔知……三條人命呀。' },
  },
  fung: {
    P2: { flip: '火石磨到咁平……真係打唔著。', agree: '我知，個火機打唔著。' },
    D1: { flip: '冇電，樓梯就冇燈。呢個係事實。', agree: '冇電，樓梯就冇燈。' },
    P1: { agree: '我講過喇。' },
    default: { flip: '證物係咁，就係咁。', agree: '嗯。', reject: '講嘢唔算證據。' },
  },
};

// 你把證物推給別人時，馮 Sir 也會湊過來看。
export const LEAN_IN = {
  P2: '（湊過來看）火石磨到咁平……真係打唔著。',
  D1: '（拿起通知書看了很久）冇電，樓梯就冇燈。呢個係事實。',
};

export const ROOMS = {
  1: {
    board: ['c1', 'c2', 'c3', 'g1', 'g2', 'g3'],
    intro: [
      { who: '旁白', text: '評議室的門在你身後鎖上。吊扇在轉，窗外落緊雨。' },
      { who: 'leung', text: '我係主席梁守仁。我哋逐條傾，我寫上黑板。' },
    ],
    openings: [
      { id: 'd1-leung', juror: 'leung', text: '督察講得好清楚，口供又簽咗名。我暫時信。', reveal: ['c1', 'c3'] },
      { id: 'd1-wong', juror: 'wong', text: '打火機刻住佢個名，仲有咩好講？', reveal: ['c2'] },
      { id: 'd1-law', juror: 'law', text: '我同意主席。', reveal: ['c1'] },
      { id: 'd1-lam', juror: 'lam', text: '督察連被告幾耐冇瞓都唔記得，我唔信份口供。', reveal: ['c3'] },
      { id: 'd1-so', juror: 'so', text: '三條人命……個看更都話見到佢喇。', reveal: ['g1'] },
      { id: 'd1-fung', juror: 'fung', text: '我淨係睇證物。人講嘅嘢，我暫時冇意見。', reveal: ['g1'] },
    ],
    interjections: [
      {
        id: 'd1-push', when: 'afterFirst', juror: 'wong',
        text: '馮 Sir，你做消防嘅。打火機喺起火點搵到，仲唔係佢？',
        reply: { juror: 'fung', claim: 'c2', doubt: '個火機打唔著。', otherwise: '未必。' },
      },
    ],
  },
  2: {
    board: ['c1', 'c2', 'c3', 'g1', 'g2', 'g3', 'w1', 'w2', 'k1'],
    intro: [
      { who: '旁白', text: '雨仲未停。黑板上，昨日的粉筆字還沒擦乾淨。' },
      { who: 'leung', text: '今日多咗三條，我照樣寫上去。' },
    ],
    openings: [
      { id: 'd2-leung', juror: 'leung', text: '多咗動機，又有火水單……我又覺得似佢做。', reveal: ['w1', 'k1'] },
      { id: 'd2-wong', juror: 'wong', text: '一個禮拜前講要燒，燒之前一日就去買火水，仲唔夠？', reveal: ['w1', 'k1'], gives: 'R6' },
      { id: 'd2-law', juror: 'law', text: '同意。', reveal: ['w1'] },
      { id: 'd2-lam', juror: 'lam', text: '代理人講嘅嘢，我一個字都唔信。', reveal: ['w1'] },
      {
        id: 'd2-so', juror: 'so', text: '街坊都話鄺婆婆好驚佢……', reveal: ['w1'],
        improper: true, effect: { usingStruck: 'h1', jurors: ['leung', 'wong', 'so'] },
      },
      { id: 'd2-fung', juror: 'fung', text: '張火水單係真嘅。不過買火水唔犯法。', reveal: ['k1'] },
    ],
    interjections: [
      {
        id: 'd2-slip', when: 'slip', juror: 'law', text: '個看更喺昇平做咗十年，好老實㗎。',
        improper: true, effect: { override: ['g1', 'g2', 'g3'], value: 'trust', jurors: ['leung', 'so', 'wong'] },
      },
    ],
  },
};

export const CALLOUT = {
  'd2-so': [
    { who: 'leung', text: '蘇太，法官叫我哋忽略嗰句。' },
    { who: 'so', text: '……對唔住。' },
  ],
  'd2-slip': [
    { who: 'leung', text: '羅生，庭上冇人講過個看更喺邊度做嘢。你點知？' },
    { who: 'law', text: '……我估嘅。' },
  ],
  invalid: [{ who: 'leung', text: '佢講嘅嘢冇問題。唔好浪費時間。' }],
};

export const RULEBOOK = {
  r1: '只可以根據法庭上的證據作判斷；不可自行調查、不可閱讀案件報道、不可與外人討論案件。',
  r2: '控方須證明被告有罪，至毫無合理疑點。有合理疑點，須判無罪。',
  r3: '《司法效率條例》：每日休庭後暫議表決（有罪、無罪或未決）。任何一方達五票，即日裁決，審訊即時結束。',
  r4: '法官指示忽略的說話，須在筆記上蓋「不予採納」；評議時不得引用。',
  r5: '傳聞證據（轉述別人的說話）不可作為事實依據。',
};

export const PROLOGUE = [
  { who: '旁白', text: '一九八七年十一月，霧港西區。' },
  { who: '旁白', text: '信昌押落閘之前，閘門的信箱掉進一封信：高等法院，陪審員傳票。' },
  { who: '母親', text: '去成個禮拜？舖頭點算呀？' },
  { who: '女兒', text: '爸爸，陪審員係咪即係判人有冇罪㗎？' },
  { who: '旁白', text: '三日後，高等法院第七號法庭。書記從木箱裡抽出一個又一個名字。' },
  { who: '書記', text: '第七號陪審員。' },
  { who: '旁白', text: '你坐上陪審席最後一個位。' },
  { who: '法官', text: '各位陪審員，開始之前，有幾件事你哋要記住。' },
  { who: '法官', text: '第一，你哋只可以根據喺呢個法庭聽到、見到嘅證據作判斷。' },
  { who: '法官', text: '第二，控方要證明被告有罪，去到毫無合理疑點。有合理疑點，就要判無罪。' },
  { who: '法官', text: '第三，根據《司法效率條例》，每日休庭之後，你哋要暫議表決。任何一方有五票，就即日裁決，審訊即時結束。' },
  { who: '法官', text: '最後，我叫你哋忽略嘅說話，請你哋喺筆記上蓋「不予採納」。' },
  { who: '旁白', text: '庭警遞給你一本《陪審員須知》和一本筆記簿。證人講到重要的說法，你就會抄下來。' },
  { who: '書記', text: '被告何嘉樂，你被控三項謀殺罪。你承認定唔承認？' },
  { who: '被告', text: '……唔承認。' },
  { who: '旁白', text: '他二十二歲，比你想像中瘦。他望向陪審席，望向你。' },
  { who: '控方', text: '各位陪審員，十一月三日凌晨，福安樓三樓樓梯起火，三人死亡。' },
  { who: '控方', text: '控方會證明，係被告因為收樓糾紛，親手放嘅火。' },
];

export const WITNESSES = {
  cheng: {
    name: '偵緝督察鄭志雄', side: '控方', claims: ['c1', 'c2', 'c3'],
    script: [
      { who: '庭警', text: '傳召控方第一證人，偵緝督察鄭志雄。' },
      { who: '旁白', text: '一個四十歲左右的男人走上證人台。宣誓時，聲音又快又平。' },
      { who: '控方', text: '督察，請你講吓當晚嘅情況。' },
      { who: '鄭督察', text: '凌晨兩點十分，消防接報。火好快就燒到四樓。' },
      { who: '鄭督察', text: '消防處初步調查，起火點喺三樓樓梯。', claim: 'c1', exhibit: 'P1' },
      { who: '控方', text: '現場有冇發現？' },
      { who: '鄭督察', text: '我哋喺起火點搵到一個打火機，上面刻住個「樂」字。', claim: 'c2', exhibit: 'P2' },
      { who: '鄭督察', text: '被告個名，叫何嘉樂。' },
      { who: '鄭督察', text: '我哋拘捕被告。佢喺警署簽咗口供，承認放火。', claim: 'c3', exhibit: 'P4' },
      { who: '控方', text: '法官大人，我冇其他問題。' },
      { who: '辯方', text: '督察，錄口供之前，被告幾耐冇瞓過？' },
      { who: '鄭督察', text: '……我唔記得。' },
      { who: '辯方', text: '冇其他問題。' },
    ],
  },
  chung: {
    name: '保安員鍾永發', side: '控方', claims: ['g1', 'g2', 'g3'],
    script: [
      { who: '庭警', text: '傳召控方第二證人，鍾永發。' },
      { who: '旁白', text: '五十幾歲，一直望住自己對鞋。' },
      { who: '控方', text: '鍾先生，你喺福安樓做咩？' },
      { who: '鍾永發', text: '我……我係嗰度嘅看更，做夜更。' },
      { who: '控方', text: '十一月三日凌晨兩點，你喺邊？' },
      { who: '鍾永發', text: '我喺更亭睇緊電視。', claim: 'g2' },
      { who: '鍾永發', text: '聽到樓梯有聲，我就行出去望吓。' },
      { who: '鍾永發', text: '見到被告由樓梯落嚟，大約兩點。', claim: 'g1' },
      { who: '控方', text: '你肯定係被告？' },
      { who: '鍾永發', text: '肯定。燈光下面睇得好清楚。', claim: 'g3' },
      { who: '辯方', text: '鍾先生，你喺福安樓做咗幾耐？' },
      { who: '鍾永發', text: '……幾年。' },
      { who: '辯方', text: '冇其他問題。' },
    ],
  },
  wat: {
    name: '業主代理人屈家輝', side: '控方', claims: ['w1', 'w2'],
    script: [
      { who: '庭警', text: '傳召控方第三證人，屈家輝。' },
      { who: '旁白', text: '西裝筆挺。坐低之前，他先望了被告一眼。' },
      { who: '控方', text: '屈先生，你同被告有咩過節？' },
      { who: '屈家輝', text: '我代表業主同租客傾收樓。被告帶頭反對。' },
      { who: '屈家輝', text: '十月廿七號，佢喺寫字樓同我嗌交，仲話「一把火燒咗佢」。', claim: 'w1' },
      { who: '屈家輝', text: '之後佢衝埋嚟，我哋拉扯，佢啲嘢跌晒落地。', claim: 'w2' },
      { who: '屈家輝', text: '街坊同我講，鄺婆婆話過好驚佢。', claim: 'h1' },
      { who: '辯方', text: '反對！呢個係傳聞證據。' },
      { who: '法官', text: '反對有效。陪審團須忽略剛才那句說話。', strike: 'h1', rule: 'r5' },
      { who: '辯方', text: '屈先生，十月廿四號，業主係咪要求電力公司截斷福安樓全幢電源？' },
      { who: '屈家輝', text: '……電線老化，要維修。' },
      { who: '辯方', text: '法官大人，辯方呈上 D1，電力公司嘅截電通知。', exhibit: 'D1' },
      { who: '辯方', text: '即係話，案發當晚，成幢樓都冇電？' },
      { who: '屈家輝', text: '……係。' },
      { who: '你', text: '成幢樓冇電……' },
      { who: '辯方', text: '冇其他問題。' },
    ],
  },
  chan: {
    name: '五金舖東主陳金水', side: '控方', claims: ['k1'],
    script: [
      { who: '庭警', text: '傳召控方第四證人，五金舖東主陳金水。' },
      { who: '控方', text: '十一月二號下晝，被告有冇嚟過你間舖？' },
      { who: '陳金水', text: '有。佢買咗兩公升火水，呢張係單。', claim: 'k1', exhibit: 'P3' },
      { who: '控方', text: '佢有冇講買嚟做咩？' },
      { who: '陳金水', text: '冇講。' },
      { who: '辯方', text: '陳生，嗰排多唔多人買火水？' },
      { who: '陳金水', text: '多。天凍，又……成條街都話冇電喎。' },
      { who: '辯方', text: '冇其他問題。' },
    ],
  },
};

export const DAYS = [
  {
    day: 1, title: '控方開案', witnesses: ['cheng', 'chung'],
    adjourn: [{ who: '法官', text: '今日聆訊到此。陪審團請按《司法效率條例》進行暫議。' }],
  },
  {
    day: 2, title: '動機與手段', witnesses: ['wat', 'chan'],
    adjourn: [{ who: '法官', text: '今日聆訊到此。陪審團請進行暫議。' }],
  },
];

export const NIGHT = {
  1: [
    { who: '旁白', text: '夜晚，信昌押。' },
    { who: '旁白', text: '當舖今日冇開。女兒伏喺櫃台上瞓著咗。' },
    { who: '母親', text: '聽日仲要去？' },
    { who: '旁白', text: '今日少做的生意：大約三百八十元。' },
  ],
};

export function morning(day, tally) {
  if (day !== 2) return [];
  return [
    { who: '旁白', text: '早上。母親把報紙放在你面前。' },
    { who: '報紙', text: `《霧港日報》：福安樓案陪審團首日暫議　有罪 ${tally.G} 票、無罪 ${tally.NG} 票、未決 ${tally.U} 票` },
    {
      who: '旁白',
      text: tally.G >= 4
        ? '法院門外的人比昨天多。有人喊：「殺人填命！」'
        : '法院門外的人比昨天多。有人舉起紙牌：「還我家園」。',
    },
  ];
}

// 審訊提早結束時，這些證人永遠不會出庭。
export const SCHEDULE = [
  { day: 2, names: ['屈家輝（業主代理人）', '陳金水（五金舖東主）'] },
  { day: 3, names: ['文醫生（法醫）'] },
  { day: 4, names: ['區志輝（消防調查主任）', '李志健（被告友人）'] },
  { day: 5, names: ['何嘉樂（被告）'] },
];

export function ending(verdict, day) {
  const back = [
    { who: '旁白', text: '庭警打開門。你們回到法庭。' },
    { who: '書記', text: '陪審團是否已有裁決？' },
  ];
  if (verdict === 'G') {
    return {
      title: day === 1 ? '一日審判' : '罪成',
      beats: [
        ...back,
        { who: 'leung', text: '……有罪。' },
        { who: '旁白', text: '何嘉樂冇郁。旁聽席上，他母親哭出聲。' },
        {
          who: '報紙',
          text: day === 1 ? '《霧港日報》：福安樓縱火案一日審結　被告謀殺罪成' : '《霧港日報》：福安樓縱火案　被告謀殺罪成',
        },
      ],
    };
  }
  if (verdict === 'NG') {
    return {
      title: '速判無罪',
      beats: [
        ...back,
        { who: 'leung', text: '……無罪。' },
        { who: '旁白', text: '何嘉樂用雙手掩住臉。旁聽席上，有人罵出聲。' },
        { who: '報紙', text: '《霧港日報》：福安樓案被告獲釋　死者家屬：公道何在' },
        { who: '旁白', text: '看更鍾永發，之後再冇人問過佢任何嘢。' },
      ],
    };
  }
  return {
    title: '未有裁決',
    beats: [
      { who: 'leung', text: '冇五票。聽日繼續。' },
      { who: '旁白', text: '第三天，法醫會出庭。' },
      { who: '旁白', text: '原型到此為止。' },
    ],
  };
}

export const PLAYTEST = [
  '第一天投票時，你有沒有覺得「這一票好重」？',
  '你說得出某位陪審員為甚麼改變主意嗎？',
  '蓋章時，你在做判斷，還是在做功課？',
  '截電通知出現後，你有沒有翻回第一天改印章？',
];
