<script setup lang="ts">
import { computed, ref } from 'vue';
import { onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app';
import { api, isLoggedIn, requireLogin, type LeaderRow, type MyRank } from '@/lib/api';
import { session } from '@/lib/session';
import { avatarText, isImageAvatar } from '@/lib/format';
import { syncTabBar, tt } from '@/lib/i18n';

type Period = 'all' | 'month';

const period = ref<Period>('all');
const list = ref<LeaderRow[]>([]);
const myRank = ref<MyRank | null>(null);
const page = ref(1);
const total = ref(0);
const loading = ref(false);
const error = ref('');
const likedIds = ref<string[]>([]);

const mine = computed(() => (period.value === 'all' ? myRank.value?.all : myRank.value?.month));
const metricLabel = computed(() => (period.value === 'all' ? 'XP' : tt('本月积分')));

async function load(reset = false) {
  if (loading.value) return;
  if (reset) {
    page.value = 1;
    list.value = [];
  }
  loading.value = true;
  error.value = '';
  try {
    const res = await api.leaderboard(period.value, page.value, 20);
    list.value = reset ? res.list : [...list.value, ...res.list];
    total.value = res.total;
    if (list.value.length < res.total) page.value += 1;
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }

  if (isLoggedIn()) {
    try {
      myRank.value = await api.myRank();
    } catch {
      myRank.value = null;
    }
  }
}

function switchPeriod(p: Period) {
  if (period.value === p) return;
  period.value = p;
  void load(true);
}

onShow(() => {
  syncTabBar();
  void load(true);
});

onPullDownRefresh(async () => {
  await load(true);
  uni.stopPullDownRefresh();
});

onReachBottom(() => {
  if (list.value.length < total.value) void load();
});

async function like(row: LeaderRow) {
  if (!requireLogin()) return;
  if (likedIds.value.includes(row.userId)) {
    uni.showToast({ title: tt('今天已经赞过 TA 了'), icon: 'none' });
    return;
  }
  try {
    const res = await api.like(row.userId, period.value);
    likedIds.value = [...likedIds.value, row.userId];
    row.likesReceived += 1;
    if (session.me) session.me.points = res.balance;
    uni.showToast({ title: tt('点赞成功 +{n} 积分', { n: res.points ?? 5 }), icon: 'none' });
  } catch (err) {
    uni.showToast({ title: (err as Error).message, icon: 'none' });
  }
}
</script>

<template>
  <view class="page">
    <view class="tabs">
      <view class="tab" :class="{ active: period === 'all' }" @tap="switchPeriod('all')">{{ tt('总榜 · XP') }}</view>
      <view class="tab" :class="{ active: period === 'month' }" @tap="switchPeriod('month')">{{ tt('月榜 · 积分') }}</view>
    </view>

    <!-- 我的排名 -->
    <view v-if="session.me" class="my-rank card">
      <view class="avatar">
        <image v-if="isImageAvatar(session.me.avatar)" :src="session.me.avatar!" mode="aspectFill" />
        <text v-else>{{ avatarText(session.me.nickname || session.me.username) }}</text>
      </view>
      <view class="grow">
        <view class="strong">{{ session.me.nickname || session.me.username }}</view>
        <view class="muted">{{ metricLabel }} {{ mine?.metric ?? 0 }}</view>
      </view>
      <view class="my-rank-no">
        <text class="rank-num">{{ mine?.rank && mine.metric > 0 ? `#${mine.rank}` : tt('未上榜') }}</text>
        <text class="muted">{{ tt('共 {n} 人', { n: mine?.total ?? 0 }) }}</text>
      </view>
    </view>

    <view class="list">
      <view v-for="row in list" :key="row.userId" class="rank-item">
        <view class="rank-badge" :class="`no-${row.rank}`">{{ row.rank }}</view>
        <view class="avatar">
          <image v-if="isImageAvatar(row.avatar)" :src="row.avatar!" mode="aspectFill" />
          <text v-else>{{ avatarText(row.nickname || row.username) }}</text>
        </view>
        <view class="grow">
          <view class="name">{{ row.nickname || row.username }}</view>
          <view class="muted">{{ tt('{n} 次答题 · 正确率 {rate}%', { n: row.quizzes, rate: row.avgRate }) }}</view>
        </view>
        <view class="right">
          <view class="metric">{{ row.metric }}<text class="metric-unit">{{ metricLabel }}</text></view>
          <view class="like" @tap="like(row)">♡ {{ row.likesReceived }}</view>
        </view>
      </view>
    </view>

    <view v-if="error" class="empty" style="color: #d92d20">{{ error }}</view>
    <view v-else-if="loading" class="empty">{{ tt('加载中…') }}</view>
    <view v-else-if="list.length === 0" class="empty">{{ tt('榜单还空着，快去答题上榜') }}</view>
  </view>
</template>

<style lang="scss" scoped>
.tabs {
  display: flex;
  background: #fff;
  border-radius: 999rpx;
  padding: 8rpx;
}

.tab {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  border-radius: 999rpx;
  font-size: 26rpx;
  color: $text;
}

.tab.active {
  background: $brand;
  color: #fff;
  font-weight: 600;
}

.my-rank {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-top: 24rpx;
  background: linear-gradient(135deg, #f3faf6 0%, #ffffff 70%);
}

.my-rank-no {
  text-align: right;
  display: flex;
  flex-direction: column;
}

.rank-num {
  font-size: 32rpx;
  font-weight: 700;
  color: $brand;
}

.list {
  margin-top: 24rpx;
  background: #fff;
  border-radius: $radius-card;
  overflow: hidden;
}

.rank-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
}

.rank-item + .rank-item {
  border-top: 1rpx solid $border;
}

.rank-badge {
  width: 44rpx;
  text-align: center;
  font-size: 26rpx;
  font-weight: 700;
  color: $text-muted;
}

.rank-badge.no-1 {
  color: #f0a020;
}

.rank-badge.no-2 {
  color: #8fa3b8;
}

.rank-badge.no-3 {
  color: #cd7f4b;
}

.name {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-strong;
}

.right {
  text-align: right;
}

.metric {
  font-size: 30rpx;
  font-weight: 700;
  color: $brand;
}

.metric-unit {
  font-size: 20rpx;
  margin-left: 4rpx;
  color: $text-muted;
  font-weight: 400;
}

.like {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: $text-muted;
  padding: 4rpx 0 4rpx 16rpx;
}
</style>
