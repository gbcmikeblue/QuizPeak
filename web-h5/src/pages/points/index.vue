<script setup lang="ts">
import { ref } from 'vue';
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app';
import {
  api,
  isLoggedIn,
  type ActivityItem,
  type PointTx,
  type PointsSummary,
} from '@/lib/api';
import { loadMe, session } from '@/lib/session';
import { dateText, syncTabBar, tt } from '@/lib/i18n';

const summary = ref<PointsSummary | null>(null);
const activities = ref<ActivityItem[]>([]);
const txs = ref<PointTx[]>([]);
const loading = ref(false);
const acting = ref(false);
const error = ref('');

async function load() {
  if (!isLoggedIn()) {
    uni.redirectTo({ url: '/pages/login/index?redirect=/pages/points/index' });
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const [s, a, t] = await Promise.all([
      api.pointsSummary(),
      api.activities(),
      api.pointTx(1, 10),
    ]);
    summary.value = s;
    activities.value = a;
    txs.value = t.list;
    if (session.me) session.me.points = s.balance;
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

onShow(() => {
  syncTabBar();
  void load();
});

onPullDownRefresh(async () => {
  await load();
  uni.stopPullDownRefresh();
});

async function doCheckin() {
  if (acting.value) return;
  acting.value = true;
  try {
    const res = await api.checkin();
    uni.showToast({
      title: tt('签到成功 +{points}（连续 {days} 天）', { points: res.points, days: res.streakDay }),
      icon: 'none',
    });
    await load();
    await loadMe(true);
  } catch (err) {
    uni.showToast({ title: (err as Error).message, icon: 'none' });
  } finally {
    acting.value = false;
  }
}

async function watchAd() {
  if (acting.value) return;
  acting.value = true;
  try {
    const res = await api.adReward();
    uni.showToast({ title: tt('观看完成 +{n} 积分', { n: res.points }), icon: 'none' });
    await load();
    await loadMe(true);
  } catch (err) {
    uni.showToast({ title: (err as Error).message, icon: 'none' });
  } finally {
    acting.value = false;
  }
}

async function claim(activity: ActivityItem) {
  if (acting.value || activity.claimed) return;
  acting.value = true;
  try {
    const res = await api.claimActivity(activity.id);
    uni.showToast({ title: tt('领取成功 +{n} 积分', { n: res.points }), icon: 'none' });
    await load();
    await loadMe(true);
  } catch (err) {
    uni.showToast({ title: (err as Error).message, icon: 'none' });
  } finally {
    acting.value = false;
  }
}
</script>

<template>
  <view class="page">
    <view class="balance brand-gradient">
      <view class="muted balance-label">{{ tt('当前积分') }}</view>
      <view class="balance-num">{{ summary?.balance ?? session.me?.points ?? 0 }}</view>
      <view class="balance-row">
        <text>{{ tt('今日已赚 {n}', { n: summary?.earnedToday ?? 0 }) }}</text>
        <text>{{ tt('连续签到 {n} 天', { n: summary?.streakDays ?? 0 }) }}</text>
      </view>
    </view>

    <view class="section-title"><text>{{ tt('每日任务') }}</text></view>

    <view class="card task" v-for="task in summary?.tasks ?? []" :key="task.type">
      <view class="grow">
        <view class="task-title">{{ tt(task.titleZh) }}</view>
        <view class="muted">
          {{ tt('每次 +{n} · 今日 {used}/{limit}', { n: task.points, used: task.usedToday, limit: task.dailyLimit }) }}
        </view>
      </view>
      <button
        v-if="task.type === 'CHECKIN'"
        class="btn btn-sm"
        :class="task.claimable ? 'btn-primary' : 'btn-ghost'"
        :disabled="!task.claimable || acting"
        @tap="doCheckin"
      >
        {{ task.claimable ? tt('签到') : tt('已签到') }}
      </button>
      <button
        v-else-if="task.type === 'AD'"
        class="btn btn-sm"
        :class="task.claimable ? 'btn-primary' : 'btn-ghost'"
        :disabled="!task.claimable || acting"
        @tap="watchAd"
      >
        {{ task.claimable ? tt('看广告') : tt('明日再来') }}
      </button>
      <view v-else class="task-tag">
        {{ task.type === 'LIKE' ? tt('去榜单点赞') : tt('见下方活动') }}
      </view>
    </view>

    <view v-if="activities.length > 0" class="section-title"><text>{{ tt('限时活动') }}</text></view>
    <view v-for="act in activities" :key="act.id" class="card activity">
      <view class="between">
        <view class="grow">
          <view class="task-title">{{ act.title }}</view>
          <view class="muted">{{ act.desc || tt('参与可得 {n} 积分', { n: act.points }) }}</view>
          <view class="muted">{{ tt('截止 {date}', { date: dateText(act.endAt) }) }}</view>
        </view>
        <button
          class="btn btn-sm"
          :class="act.claimed ? 'btn-ghost' : 'btn-primary'"
          :disabled="act.claimed || acting"
          @tap="claim(act)"
        >
          {{ act.claimed ? tt('已领取') : `+${act.points}` }}
        </button>
      </view>
    </view>

    <view class="section-title">
      <text>{{ tt('积分明细') }}</text>
    </view>
    <view class="card tx-list">
      <view v-if="txs.length === 0" class="empty" style="padding: 48rpx 0">{{ tt('还没有积分记录') }}</view>
      <view v-for="tx in txs" :key="tx.id" class="tx">
        <view class="grow">
          <view class="tx-remark">{{ tx.remark || tx.type }}</view>
          <view class="muted">{{ dateText(tx.createdAt) }}</view>
        </view>
        <view class="tx-change" :class="{ plus: tx.change > 0 }">
          {{ tx.change > 0 ? '+' : '' }}{{ tx.change }}
        </view>
      </view>
    </view>

    <view v-if="error" class="empty" style="color: #d92d20">{{ error }}</view>
  </view>
</template>

<style lang="scss" scoped>
.balance {
  border-radius: 20rpx;
  padding: 36rpx 32rpx;
  color: #fff;
}

.balance-label {
  color: rgba(255, 255, 255, 0.8);
}

.balance-num {
  font-size: 72rpx;
  font-weight: 800;
  line-height: 1.2;
}

.balance-row {
  display: flex;
  gap: 32rpx;
  margin-top: 16rpx;
  font-size: 24rpx;
  opacity: 0.9;
}

.task {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 16rpx;
}

.task-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-strong;
}

.task-tag {
  font-size: 24rpx;
  color: $brand-deep;
  background: $brand-soft;
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
}

.activity {
  margin-bottom: 16rpx;
}

.tx-list {
  padding: 8rpx 28rpx;
}

.tx {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
}

.tx + .tx {
  border-top: 1rpx solid $border;
}

.tx-remark {
  font-size: 26rpx;
  color: $text-strong;
}

.tx-change {
  font-size: 28rpx;
  font-weight: 700;
  color: $danger;
}

.tx-change.plus {
  color: $brand;
}
</style>
