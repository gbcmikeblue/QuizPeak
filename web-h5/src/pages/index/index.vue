<script setup lang="ts">
import { ref } from 'vue';
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app';
import { api, isLoggedIn, type LeaderRow, type QuizCard } from '@/lib/api';
import { loadMe, session } from '@/lib/session';
import { difficultyColor, difficultyLabel } from '@/lib/format';
import { syncTabBar, tt } from '@/lib/i18n';

const quizzes = ref<QuizCard[]>([]);
const topUsers = ref<LeaderRow[]>([]);
const loading = ref(true);
const error = ref('');

async function loadAll() {
  loading.value = true;
  error.value = '';
  try {
    const [quizPage, board] = await Promise.all([
      api.quizzes({ pageSize: 3 }),
      api.leaderboard('all', 1, 3),
    ]);
    quizzes.value = quizPage.list;
    topUsers.value = board.list;
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

onShow(() => {
  syncTabBar();
  void loadAll();
  if (isLoggedIn()) void loadMe();
});

onPullDownRefresh(async () => {
  await Promise.all([loadAll(), isLoggedIn() ? loadMe(true) : Promise.resolve(null)]);
  uni.stopPullDownRefresh();
});

function openQuiz(id: string) {
  uni.navigateTo({ url: `/pages/quiz/detail?id=${id}` });
}

function goLogin() {
  uni.navigateTo({ url: '/pages/login/index' });
}

function goPoints() {
  if (!session.me && !isLoggedIn()) return goLogin();
  uni.navigateTo({ url: '/pages/points/index' });
}

function goTab(url: string) {
  uni.switchTab({ url });
}
</script>

<template>
  <view class="page">
    <!-- 品牌 / 余额 -->
    <view class="hero brand-gradient">
      <view class="between">
        <view>
          <view class="hero-title">知巅 QuizPeak</view>
          <view class="hero-slogan">{{ tt('答题登顶，积分上榜') }}</view>
        </view>
        <view v-if="session.me" class="hero-balance" @tap="goPoints">
          <view class="hero-balance-num">{{ session.me.points }}</view>
          <view class="hero-balance-label">{{ tt('积分') }}</view>
        </view>
        <view v-else class="hero-login" @tap="goLogin">{{ tt('登录 / 注册') }}</view>
      </view>

      <view v-if="session.me" class="hero-stats">
        <view class="hero-stat">
          <text class="num">{{ session.me.level }}</text>
          <text class="label">{{ tt('等级') }}</text>
        </view>
        <view class="hero-stat">
          <text class="num">{{ session.me.xp }}</text>
          <text class="label">XP</text>
        </view>
        <view class="hero-stat">
          <text class="num">{{ session.me.streakDays }}</text>
          <text class="label">{{ tt('连续签到') }}</text>
        </view>
        <view class="hero-stat">
          <text class="num">{{ session.me.likesReceived }}</text>
          <text class="label">{{ tt('获赞') }}</text>
        </view>
      </view>
    </view>

    <!-- 快捷任务 -->
    <view class="quick">
      <view class="quick-item" @tap="goPoints">
        <view class="quick-icon">📅</view>
        <view class="quick-text">
          <view class="quick-title">{{ tt('每日签到') }}</view>
          <view class="muted">
            {{ session.me?.streakDays ? tt('已连续 {n} 天', { n: session.me.streakDays }) : tt('+10 积分') }}
          </view>
        </view>
      </view>
      <view class="quick-item" @tap="goPoints">
        <view class="quick-icon">🎬</view>
        <view class="quick-text">
          <view class="quick-title">{{ tt('看广告赚积分') }}</view>
          <view class="muted">{{ tt('每日最多 5 次') }}</view>
        </view>
      </view>
    </view>

    <!-- 推荐题库 -->
    <view class="section-title">
      <text>{{ tt('推荐题库') }}</text>
      <text class="more" @tap="goTab('/pages/quizzes/index')">{{ tt('全部') }} ›</text>
    </view>

    <view v-if="error" class="card error-card">{{ tt('接口请求失败') }}：{{ error }}</view>

    <view
      v-for="quiz in quizzes"
      :key="quiz.id"
      class="card quiz-card"
      @tap="openQuiz(quiz.id)"
    >
      <view class="between">
        <view class="grow">
          <view class="quiz-title">{{ quiz.title }}</view>
          <view class="quiz-meta">
            <text
              class="tag"
              :style="{ color: difficultyColor(quiz.difficulty), background: `${difficultyColor(quiz.difficulty)}1a` }"
            >
              {{ tt(difficultyLabel(quiz.difficulty)) }}
            </text>
            <text class="muted">· {{ tt('{n} 关', { n: quiz.levelsCount }) }} · {{ tt('{n} 题', { n: quiz.questionCount }) }}</text>
          </view>
        </view>
        <view class="quiz-side">
          <view class="quiz-side-num">{{ quiz.playerCount }}</view>
          <view class="muted">{{ tt('人已挑战') }}</view>
        </view>
      </view>
      <view v-if="quiz.enrollFee > 0" class="quiz-fee">{{ tt('解锁需 {n} 积分', { n: quiz.enrollFee }) }}</view>
    </view>

    <view v-if="!loading && quizzes.length === 0 && !error" class="empty">{{ tt('暂无题库') }}</view>

    <!-- 榜单 Top3 -->
    <view class="section-title">
      <text>{{ tt('总榜 TOP 3') }}</text>
      <text class="more" @tap="goTab('/pages/leaderboard/index')">{{ tt('完整榜单') }} ›</text>
    </view>

    <view class="card">
      <view v-if="topUsers.length === 0" class="empty" style="padding: 48rpx 0">还没有人上榜，去成为第一个</view>
      <view v-for="row in topUsers" :key="row.userId" class="rank-row">
        <view class="rank-no" :class="`rank-${row.rank}`">{{ row.rank }}</view>
        <view class="grow">
          <view class="strong">{{ row.nickname || row.username }}</view>
          <view class="muted">{{ row.xp }} XP · 完成 {{ row.quizzes }} 次答题</view>
        </view>
        <view class="rank-likes">♡ {{ row.likesReceived }}</view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.hero {
  border-radius: 20rpx;
  padding: 36rpx 32rpx;
  color: #fff;
}

.hero-title {
  font-size: 40rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}

.hero-slogan {
  margin-top: 8rpx;
  font-size: 24rpx;
  opacity: 0.85;
}

.hero-login {
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
  font-size: 26rpx;
  white-space: nowrap;
  flex-shrink: 0;
}

.hero-balance {
  text-align: right;
}

.hero-balance-num {
  font-size: 44rpx;
  font-weight: 700;
  line-height: 1.1;
}

.hero-balance-label {
  font-size: 22rpx;
  opacity: 0.8;
}

.hero-stats {
  display: flex;
  margin-top: 32rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.2);
}

.hero-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero-stat .num {
  font-size: 32rpx;
  font-weight: 600;
}

.hero-stat .label {
  font-size: 22rpx;
  opacity: 0.8;
}

.quick {
  display: flex;
  gap: 20rpx;
  margin-top: 24rpx;
}

.quick-item {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #fff;
  border-radius: $radius-card;
  padding: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(16, 24, 40, 0.04);
}

.quick-text {
  min-width: 0;
  flex: 1;
  overflow: hidden;
}

.quick-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: $brand-soft;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
}

.quick-title {
  font-size: 26rpx;
  color: $text-strong;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quiz-card {
  margin-bottom: 20rpx;
}

.quiz-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-strong;
}

.quiz-meta {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-top: 12rpx;
}

.quiz-side {
  text-align: center;
  padding-left: 20rpx;
  flex-shrink: 0;
}

.quiz-side-num {
  font-size: 34rpx;
  font-weight: 700;
  color: $brand;
}

.quiz-fee {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx dashed $border;
  font-size: 24rpx;
  color: #b54708;
}

.error-card {
  color: $danger;
  font-size: 26rpx;
}

.rank-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 0;
}

.rank-row + .rank-row {
  border-top: 1rpx solid $border;
}

.rank-no {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: $bg-page;
  color: $text-muted;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
}

.rank-1 {
  background: #fdf3d7;
  color: #b54708;
}

.rank-2 {
  background: #eef2f6;
  color: #475467;
}

.rank-3 {
  background: #fbeee7;
  color: #b54708;
}

.rank-likes {
  font-size: 24rpx;
  color: $text-muted;
}
</style>
