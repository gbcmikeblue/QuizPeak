<script setup lang="ts">
import { ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import {
  api,
  isLoggedIn,
  requireLogin,
  type LevelProgress,
  type QuizDetail,
  type QuizProgress,
} from '@/lib/api';
import { loadMe, session } from '@/lib/session';
import { difficultyColor, difficultyLabel } from '@/lib/format';
import { syncNavTitle, tt } from '@/lib/i18n';

const quizId = ref('');
const quiz = ref<QuizDetail | null>(null);
const progress = ref<QuizProgress | null>(null);
const error = ref('');
const starting = ref(false);

async function load() {
  error.value = '';
  try {
    quiz.value = await api.quiz(quizId.value);
    if (isLoggedIn()) {
      progress.value = await api.quizProgress(quizId.value);
      void loadMe();
    }
  } catch (err) {
    error.value = (err as Error).message;
  }
}

onLoad((options) => {
  quizId.value = (options?.id as string) ?? '';
  if (!quizId.value) {
    error.value = tt('缺少题库 ID');
    return;
  }
  void load();
});

onShow(() => {
  syncNavTitle();
});

function levelOf(levelNo: number): LevelProgress | undefined {
  return progress.value?.levels.find((l) => l.levelNo === levelNo);
}

/** 未登录时第 1 关可点（点了会引导登录），其余关提示登录后查看进度 */
function isUnlocked(levelNo: number): boolean {
  if (!progress.value) return levelNo === 1;
  return levelOf(levelNo)?.unlocked ?? false;
}

async function start(levelNo: number) {
  if (!requireLogin()) return;
  if (starting.value) return;

  const detail = quiz.value;
  if (!detail) return;

  if (!isUnlocked(levelNo)) {
    uni.showToast({ title: tt('先通过上一关才能解锁'), icon: 'none' });
    return;
  }

  const needPay = detail.enrollFee > 0 && !progress.value?.enrolled;
  if (needPay) {
    const confirmed = await new Promise<boolean>((resolve) => {
      uni.showModal({
        title: tt('解锁题库'),
        content: tt('本次将消耗 {n} 积分，确认开始？', { n: detail.enrollFee }),
        confirmText: tt('确认解锁'),
        success: (res) => resolve(res.confirm),
        fail: () => resolve(false),
      });
    });
    if (!confirmed) return;

    starting.value = true;
    try {
      await api.enroll(quizId.value);
      await loadMe(true);
    } catch (err) {
      uni.showToast({ title: (err as Error).message, icon: 'none' });
      starting.value = false;
      return;
    }
    starting.value = false;
  }

  uni.navigateTo({ url: `/pages/quiz/play?id=${quizId.value}&level=${levelNo}` });
}
</script>

<template>
  <view class="page">
    <view v-if="error" class="card" style="color: #d92d20">{{ error }}</view>

    <template v-if="quiz">
      <view class="card head">
        <view class="title">{{ quiz.title }}</view>
        <view class="meta">
          <text
            class="tag"
            :style="{ color: difficultyColor(quiz.difficulty), background: `${difficultyColor(quiz.difficulty)}1a` }"
          >
            {{ tt(difficultyLabel(quiz.difficulty)) }}
          </text>
          <text class="muted">{{ quiz.category?.name ?? tt('综合') }}</text>
        </view>

        <view class="stats">
          <view class="stat">
            <view class="stat-num">{{ quiz.levelsCount }}</view>
            <view class="muted">{{ tt('关卡') }}</view>
          </view>
          <view class="stat">
            <view class="stat-num">{{ quiz.questionTotal }}</view>
            <view class="muted">{{ tt('题目') }}</view>
          </view>
          <view class="stat">
            <view class="stat-num">{{ quiz.playerCount }}</view>
            <view class="muted">{{ tt('挑战人数') }}</view>
          </view>
          <view class="stat">
            <view class="stat-num">{{ quiz.enrollFee > 0 ? quiz.enrollFee : tt('免费') }}</view>
            <view class="muted">{{ quiz.enrollFee > 0 ? tt('解锁积分') : tt('门槛') }}</view>
          </view>
        </view>

        <view v-if="quiz.description" class="desc">{{ quiz.description }}</view>
        <view class="rule">
          {{
            tt('总时长约 {m} 分钟，单题限时以答题页倒计时为准；通过率 ≥ {rate}% 解锁下一关。', {
              m: Math.round(quiz.durationSec / 60),
              rate: quiz.unlockThreshold,
            })
          }}
        </view>
      </view>

      <view class="section-title">
        <text>{{ tt('关卡') }}</text>
        <text v-if="session.me" class="more">{{ tt('我的积分 {n}', { n: session.me.points }) }}</text>
        <text v-else class="more" @tap="requireLogin()">{{ tt('登录查看进度') }}</text>
      </view>

      <view class="levels">
        <view
          v-for="level in quiz.levels"
          :key="level.id"
          class="level-card"
          :class="{ locked: !isUnlocked(level.levelNo) }"
          @tap="start(level.levelNo)"
        >
          <view class="level-no">{{ level.levelNo }}</view>
          <view class="grow">
            <view class="level-title">
              {{ tt('第 {n} 关', { n: level.levelNo }) }}
              <text v-if="!isUnlocked(level.levelNo)" class="lock">🔒</text>
            </view>
            <view class="muted">
              {{ tt('{n} 题 · 通过率 ≥ {rate}%', { n: level.questionCount, rate: level.passThreshold }) }}
              <text v-if="levelOf(level.levelNo)?.best.rate">
                · {{ tt('最佳 {rate}%', { rate: levelOf(level.levelNo)?.best.rate }) }}
              </text>
            </view>
          </view>
          <view class="level-action">
            {{ levelOf(level.levelNo)?.best.attemptId ? tt('重做') : tt('开始') }}
          </view>
        </view>
      </view>
    </template>

    <view v-else-if="!error" class="empty">{{ tt('加载中…') }}</view>
  </view>
</template>

<style lang="scss" scoped>
.head {
  background: linear-gradient(150deg, #ffffff 0%, #f3faf6 100%);
}

.title {
  font-size: 38rpx;
  font-weight: 700;
  color: $text-strong;
}

.meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 14rpx;
}

.stats {
  display: flex;
  margin-top: 28rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid $border;
}

.stat {
  flex: 1;
  text-align: center;
}

.stat-num {
  font-size: 32rpx;
  font-weight: 700;
  color: $brand;
}

.desc {
  margin-top: 24rpx;
  font-size: 26rpx;
  color: $text;
  line-height: 1.7;
}

.rule {
  margin-top: 16rpx;
  padding: 16rpx 20rpx;
  border-radius: 12rpx;
  background: $brand-soft;
  color: $brand-deep;
  font-size: 24rpx;
  line-height: 1.6;
}

.level-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #fff;
  border-radius: $radius-card;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.level-card.locked {
  opacity: 0.55;
}

.level-no {
  width: 64rpx;
  height: 64rpx;
  border-radius: 20rpx;
  background: $brand-soft;
  color: $brand-deep;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 28rpx;
}

.level-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-strong;
}

.lock {
  font-size: 22rpx;
  margin-left: 6rpx;
}

.level-action {
  padding: 10rpx 24rpx;
  border-radius: 999rpx;
  background: $brand;
  color: #fff;
  font-size: 24rpx;
}
</style>
