<script setup lang="ts">
import { ref } from 'vue';
import { onReachBottom, onShow } from '@dcloudio/uni-app';
import { api, type Difficulty, type QuizCard } from '@/lib/api';
import { difficultyColor, difficultyLabel } from '@/lib/format';
import { syncTabBar, tt } from '@/lib/i18n';

const PAGE_SIZE = 10;

const FILTERS: { key: '' | Difficulty; label: string }[] = [
  { key: '', label: '全部' },
  { key: 'BEGINNER', label: '入门' },
  { key: 'INTERMEDIATE', label: '进阶' },
  { key: 'ADVANCED', label: '高手' },
];

const list = ref<QuizCard[]>([]);
const keyword = ref('');
const difficulty = ref<'' | Difficulty>('');
const page = ref(1);
const total = ref(0);
const loading = ref(false);
const finished = ref(false);
const error = ref('');

async function load(reset = false) {
  if (loading.value) return;
  if (reset) {
    page.value = 1;
    finished.value = false;
    list.value = [];
  }
  if (finished.value) return;

  loading.value = true;
  error.value = '';
  try {
    const res = await api.quizzes({
      page: page.value,
      pageSize: PAGE_SIZE,
      keyword: keyword.value.trim(),
      difficulty: difficulty.value,
    });
    list.value = reset ? res.list : [...list.value, ...res.list];
    total.value = res.total;
    finished.value = list.value.length >= res.total;
    if (!finished.value) page.value += 1;
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

function changeFilter(key: '' | Difficulty) {
  if (difficulty.value === key) return;
  difficulty.value = key;
  void load(true);
}

function onSearch() {
  void load(true);
}

function clearSearch() {
  keyword.value = '';
  void load(true);
}

onReachBottom(() => {
  void load();
});

onShow(() => {
  syncTabBar();
});

void load(true);

function openQuiz(id: string) {
  uni.navigateTo({ url: `/pages/quiz/detail?id=${id}` });
}
</script>

<template>
  <view class="page">
    <view class="search-bar">
      <text class="search-icon">🔍</text>
      <input
        v-model="keyword"
        class="search-input"
        type="text"
        :placeholder="tt('搜索题库名称')"
        confirm-type="search"
        @confirm="onSearch"
      />
      <text v-if="keyword" class="search-clear" @tap="clearSearch">✕</text>
    </view>

    <view class="filters">
      <view
        v-for="f in FILTERS"
        :key="f.key"
        class="filter"
        :class="{ active: difficulty === f.key }"
        @tap="changeFilter(f.key)"
      >
        {{ tt(f.label) }}
      </view>
    </view>

    <view class="muted total">{{ tt('共 {n} 个题库', { n: total }) }}</view>

    <view v-for="quiz in list" :key="quiz.id" class="card quiz-item" @tap="openQuiz(quiz.id)">
      <view class="between">
        <view class="grow">
          <view class="title">{{ quiz.title }}</view>
          <view class="meta">
            <text
              class="tag"
              :style="{ color: difficultyColor(quiz.difficulty), background: `${difficultyColor(quiz.difficulty)}1a` }"
            >
              {{ tt(difficultyLabel(quiz.difficulty)) }}
            </text>
            <text class="muted">
              {{ quiz.category?.name ?? tt('综合') }} · {{ tt('{n} 关', { n: quiz.levelsCount }) }} ·
              {{ tt('{n} 题', { n: quiz.questionCount }) }}
            </text>
          </view>
        </view>
        <view class="arrow">›</view>
      </view>
      <view class="quiz-footer">
        <text class="muted">{{ tt('{n} 人挑战', { n: quiz.playerCount }) }}</text>
        <text class="fee" :class="{ free: quiz.enrollFee === 0 }">
          {{ quiz.enrollFee > 0 ? tt('{n} 积分解锁', { n: quiz.enrollFee }) : tt('免费') }}
        </text>
      </view>
    </view>

    <view v-if="error" class="empty" style="color: #d92d20">{{ error }}</view>
    <view v-else-if="loading" class="empty">{{ tt('加载中…') }}</view>
    <view v-else-if="list.length === 0" class="empty">{{ tt('没有找到匹配的题库') }}</view>
    <view v-else-if="finished" class="empty">{{ tt('已经到底了') }}</view>
  </view>
</template>

<style lang="scss" scoped>
.search-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: #fff;
  border-radius: 999rpx;
  padding: 0 24rpx;
  height: 76rpx;
}

.search-icon {
  font-size: 26rpx;
  opacity: 0.6;
}

.search-input {
  flex: 1;
  font-size: 26rpx;
  color: $text-strong;
}

.search-clear {
  font-size: 24rpx;
  color: $text-muted;
  padding: 8rpx;
}

.filters {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
}

.filter {
  padding: 10rpx 28rpx;
  border-radius: 999rpx;
  background: #fff;
  color: $text;
  font-size: 26rpx;
}

.filter.active {
  background: $brand;
  color: #fff;
  font-weight: 600;
}

.total {
  margin: 24rpx 8rpx 8rpx;
}

.quiz-item {
  margin-bottom: 20rpx;
}

.title {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-strong;
}

.meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 12rpx;
}

.arrow {
  color: #cbd2dc;
  font-size: 40rpx;
  padding-left: 12rpx;
}

.quiz-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 18rpx;
  padding-top: 18rpx;
  border-top: 1rpx solid $border;
}

.fee {
  font-size: 24rpx;
  color: #b54708;
}

.fee.free {
  color: $brand;
}
</style>
