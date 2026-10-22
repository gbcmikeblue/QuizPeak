/** 品牌唯一来源：改名 / 换域名只需改这里 */
export const BRAND = {
  nameZh: '知巅',
  nameEn: 'QuizPeak',
  /** 英文小写标识：包名、容器名、存储 key、issuer */
  slug: 'quizpeak',
  domain: 'quizpeak.cn',
  email: 'hello@quizpeak.cn',
  sloganZh: '答题登顶，积分上榜',
  sloganEn: 'Answer. Climb. Top the board.',
  /** 积分单位名称（不使用任何货币表述） */
  pointUnitZh: '积分',
  pointUnitEn: 'Points',
} as const;

export const COPYRIGHT = `© ${new Date().getFullYear()} ${BRAND.nameZh} ${BRAND.nameEn}. All rights reserved.`;
