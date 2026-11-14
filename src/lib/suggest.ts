/**
 * たるまるの「前進のための提案」。LLM は使わず、カテゴリ・状態・残り日数でテンプレートから選ぶ。
 * 同じ人に同じ文が続かないよう、最近届けたお便りに入っている文は避ける。
 */

export type Feeling = 'good' | 'stuck' | 'tired'

/** 期限までの残り日数で分けた段階。期限なしは far 扱い */
type Phase = 'far' | 'mid' | 'near' | 'over'

const BY_PHASE: Record<Phase, string[]> = {
  far: [
    '今週やることを1つだけ決めよか。',
    'ゴールまでを3つに分けて、最初の1個だけ書き出してみ。',
    '次の報告会で言いたいことを1行だけ考えてみよか。そこから逆算や。',
  ],
  mid: [
    '残りの日数で、やることを3つまでに絞ってみよか。',
    '今日か明日、30分だけ時間を押さえとこ。',
    '途中まででも、だれかに見せてみ。ひとことで進み方が変わるで。',
  ],
  near: [
    '完璧やなくても、できたとこまで提出しよ。',
    '残りでできることを1つに絞ろか。それができたら上出来や。',
    '途中の写真1枚でもええ、成果に出してみ。',
  ],
  over: [
    'できたとこまでで報告しよ。報告したら、それで一歩や。',
    '「なんでできなかったんだろうね会」のネタにしてもええねん。気楽に報告しよ。',
    '続けたいなら、期限を決め直して宣言し直すのもアリやで。',
  ],
}

const BY_FEELING: Record<Exclude<Feeling, 'good'>, string[]> = {
  stuck: [
    '5分だけ手をつけてみよか。タイマー鳴ったらやめてええで。',
    '「貸してほしい力」に書いてみ。手挙げてくれる人、おるかもしれへんで。',
    '止まってる理由を1行だけコメントに書いてみ。書くだけで頭が整理されるで。',
    'いちばん小さい一歩って何やろ？ それだけ今日やってみよか。',
  ],
  tired: [
    'しんどいときは休んでええ。今日はなんもせんで、明日5分だけ考えよ。',
    'やることを半分に減らしてみよか。ゆるく、でええねん。',
    '一人で抱えんと、お店でだれかに話してみ。飲みながらでええ。',
    '「貸してほしい力」に書いて、ちょっと人に頼ってみよか。',
  ],
}

const BY_CAT: Record<string, string[]> = {
  work: ['関係ある人に1通だけ連絡してみよか。', '調べもの15分だけやってみよか。', '要る資料を1つだけ集めよか。'],
  love: ['気になる人に、ひとことだけメッセージ送ってみ。', '出会えそうな場所を1つ調べて、予定に入れてみよか。', '会う約束、日にちの候補だけでも出してみ。'],
  hobby: ['道具を出して、目につくとこに置いとくだけでもええで。', 'お手本にしたい人の作品を1つ見てみよか。', '15分だけ練習してみよか。'],
  trip: ['行き先の候補を3つ挙げてみよか。', '行けそうな日をカレンダーで押さえよか。', '宿か交通を1つだけ調べてみ。'],
  life: ['まず1日だけやってみよか。', 'やる時間を決めて、スマホにリマインド入れとこ。', '要るもんを1つ用意してみよか。'],
}

function phaseOf(daysLeft: number | null): Phase {
  if (daysLeft === null || daysLeft > 14) return 'far'
  if (daysLeft > 3) return 'mid'
  if (daysLeft >= 0) return 'near'
  return 'over'
}

/** 状況に合う候補（重なりなし）。テスト・確認用に公開 */
export function candidates(input: { cat: string; daysLeft: number | null; feeling?: Feeling }): string[] {
  const phase = phaseOf(input.daysLeft)
  const cat = BY_CAT[input.cat] ?? []
  let list: string[]
  if (input.feeling === 'tired') list = BY_FEELING.tired
  else if (input.feeling === 'stuck') list = phase === 'near' || phase === 'over' ? [...BY_FEELING.stuck, ...BY_PHASE[phase]] : [...BY_FEELING.stuck, ...cat]
  else if (phase === 'near' || phase === 'over') list = BY_PHASE[phase]
  else list = [...BY_PHASE[phase], ...cat]
  return [...new Set(list)]
}

/**
 * 次の一歩を1つ選ぶ。recent（最近そのひとに届けたお便りの本文）に入っている文は避ける。
 * 全部使い切っていたら、その中から選び直す。
 */
export function suggestStep(input: { cat: string; daysLeft: number | null; feeling?: Feeling }, recent: string[] = []): string {
  const all = candidates(input)
  const fresh = all.filter((s) => !recent.some((r) => r.includes(s)))
  const pool = fresh.length > 0 ? fresh : all
  return pool[Math.floor(Math.random() * pool.length)]
}

/** お便りの本文に添えるときの形 */
export const withStep = (body: string, step: string) => `${body}\n次の一歩：${step}`
