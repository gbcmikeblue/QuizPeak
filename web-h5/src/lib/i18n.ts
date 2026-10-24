import { computed, ref } from 'vue';
import { DEFAULT_LOCALE, LOCALE_LABELS, LOCALES, createI18n, normalizeLocale, type Locale } from '@quizpeak/i18n';

const LOCALE_KEY = 'quizpeak_h5_locale';

/** 当前语言（响应式，存在本地存储里） */
export const locale = ref<Locale>(normalizeLocale(uni.getStorageSync(LOCALE_KEY) || DEFAULT_LOCALE));

export const i18n = computed(() => createI18n(locale.value));

/** 模板里直接用：{{ tt('首页') }} */
export function tt(source: string, vars?: Record<string, string | number>): string {
  return i18n.value.tt(source, vars);
}

export function t(key: string, vars?: Record<string, string | number>): string {
  return i18n.value.t(key, vars);
}

export function dateText(value: string | number | Date | null | undefined, withTime = false): string {
  return i18n.value.date(value, withTime);
}

export { LOCALES, LOCALE_LABELS };
export type { Locale };

const TAB_LABELS: Record<number, string> = { 0: '首页', 1: '题库', 2: '榜单', 3: '我的' };

/** pages.json 里的导航标题是静态的，切语言时按路由同步 */
const NAV_TITLES: Record<string, string> = {
  'pages/index/index': '知巅 QuizPeak',
  'pages/quizzes/index': '题库',
  'pages/leaderboard/index': '排行榜',
  'pages/me/index': '我的',
  'pages/points/index': '积分中心',
  'pages/login/index': '登录',
  'pages/quiz/detail': '题库详情',
  'pages/quiz/play': '答题',
};

function applyNavigationTitle() {
  try {
    const pages = getCurrentPages();
    const current = pages[pages.length - 1] as { route?: string } | undefined;
    const zh = current?.route ? NAV_TITLES[current.route] : '';
    if (zh) uni.setNavigationBarTitle({ title: tt(zh) });
  } catch {
    /* 忽略：部分页面没有导航栏 */
  }
}

/** tabBar 文案不在页面里，切语言时要手动更新 */
function applyTabBar() {
  Object.entries(TAB_LABELS).forEach(([index, zh]) => {
    try {
      uni.setTabBarItem({ index: Number(index), text: tt(zh) });
    } catch {
      /* 非 tabBar 页面调用会报错，忽略 */
    }
  });
}

export function setLocale(next: Locale) {
  locale.value = next;
  uni.setStorageSync(LOCALE_KEY, next);
  applyTabBar();
  applyNavigationTitle();
}

/** App 启动 / 每次进入页面时同步 tabBar 与导航标题 */
export function syncTabBar() {
  applyTabBar();
  applyNavigationTitle();
}

/** 页面显示时调用（pages.json 的标题是静态中文） */
export function syncNavTitle() {
  applyNavigationTitle();
}
