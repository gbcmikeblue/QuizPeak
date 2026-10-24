<script setup lang="ts">
import { ref } from 'vue';
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app';
import { api, isLoggedIn, type AttemptHistoryItem } from '@/lib/api';
import { loadMe, logout, session } from '@/lib/session';
import { avatarText, isImageAvatar, maskPhone } from '@/lib/format';
import {
  LOCALES,
  LOCALE_LABELS,
  dateText,
  locale,
  setLocale,
  syncTabBar,
  tt,
  type Locale,
} from '@/lib/i18n';

const history = ref<AttemptHistoryItem[]>([]);
const loading = ref(false);

async function load() {
  if (!isLoggedIn()) {
    session.me = null;
    return;
  }
  loading.value = true;
  await loadMe(true);
  try {
    const res = await api.history('quiz', 1, 5);
    history.value = res.list;
  } catch {
    history.value = [];
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

function goLogin() {
  uni.navigateTo({ url: '/pages/login/index' });
}

function goPoints() {
  uni.navigateTo({ url: '/pages/points/index' });
}

function confirmLogout() {
  uni.showModal({
    title: tt('退出登录'),
    content: tt('确定要退出当前账号吗？'),
    success: async (res) => {
      if (!res.confirm) return;
      await logout();
      history.value = [];
      uni.showToast({ title: tt('已退出'), icon: 'none' });
    },
  });
}

function changeLocale(next: Locale) {
  if (next === locale.value) return;
  setLocale(next);
  uni.showToast({ title: LOCALE_LABELS[next], icon: 'none' });
}
</script>

<template>
  <view class="page">
    <!-- 未登录 -->
    <view v-if="!session.me" class="card guest">
      <view class="guest-title">{{ tt('还没有登录') }}</view>
      <view class="muted">{{ tt('登录后可答题、签到、赚积分并上榜') }}</view>
      <button class="btn btn-primary guest-btn" @tap="goLogin">{{ tt('手机号登录 / 注册') }}</button>
    </view>

    <!-- 已登录 -->
    <template v-else>
      <view class="profile brand-gradient">
        <view class="row" style="gap: 24rpx">
          <view class="avatar avatar-lg">
            <image v-if="isImageAvatar(session.me.avatar)" :src="session.me.avatar!" mode="aspectFill" />
            <text v-else>{{ avatarText(session.me.nickname || session.me.username) }}</text>
          </view>
          <view class="grow">
            <view class="name">{{ session.me.nickname || session.me.username }}</view>
            <view class="phone">{{ maskPhone(session.me.phone) }}</view>
          </view>
          <view class="level">Lv.{{ session.me.level }}</view>
        </view>

        <view class="profile-stats">
          <view class="pstat" @tap="goPoints">
            <text class="pnum">{{ session.me.points }}</text>
            <text class="plabel">{{ tt('积分') }}</text>
          </view>
          <view class="pstat">
            <text class="pnum">{{ session.me.xp }}</text>
            <text class="plabel">XP</text>
          </view>
          <view class="pstat">
            <text class="pnum">{{ session.me.likesReceived }}</text>
            <text class="plabel">{{ tt('获赞') }}</text>
          </view>
          <view class="pstat">
            <text class="pnum">{{ session.me.streakDays }}</text>
            <text class="plabel">{{ tt('连续签到') }}</text>
          </view>
        </view>
      </view>

      <view class="card menu">
        <view class="menu-item" @tap="goPoints">
          <text>{{ tt('积分中心') }}</text>
          <text class="arrow">›</text>
        </view>
        <view class="menu-item">
          <text>{{ tt('邀请码') }}</text>
          <text class="muted">{{ session.me.inviteCode }}</text>
        </view>
        <view class="menu-item">
          <text>{{ tt('注册时间') }}</text>
          <text class="muted">{{ dateText(session.me.createdAt) }}</text>
        </view>
        <view class="menu-item lang-item">
          <text>{{ tt('语言') }}</text>
          <view class="lang-switch">
            <view
              v-for="item in LOCALES"
              :key="item"
              class="lang-pill"
              :class="{ active: locale === item }"
              @tap="changeLocale(item)"
            >
              {{ LOCALE_LABELS[item] }}
            </view>
          </view>
        </view>
      </view>

      <view class="section-title"><text>{{ tt('最近答题') }}</text></view>
      <view class="card">
        <view v-if="loading" class="empty" style="padding: 48rpx 0">{{ tt('加载中…') }}</view>
        <view v-else-if="history.length === 0" class="empty" style="padding: 48rpx 0">
          {{ tt('还没有答题记录') }}
        </view>
        <view v-for="item in history" :key="item.id" class="history">
          <view class="grow">
            <view class="history-title">{{ item.quiz?.title ?? tt('答题') }}</view>
            <view class="muted">{{ dateText(item.finishedAt) }}</view>
          </view>
          <view class="history-score">
            {{ item.score }}<text class="history-total">/{{ item.totalScore }}</text>
          </view>
        </view>
      </view>

      <view class="logout" @tap="confirmLogout">{{ tt('退出登录') }}</view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.guest {
  text-align: center;
  padding: 64rpx 32rpx;
}

.guest-title {
  font-size: 34rpx;
  font-weight: 700;
  color: $text-strong;
  margin-bottom: 12rpx;
}

.guest-btn {
  margin-top: 32rpx;
}

.profile {
  border-radius: 20rpx;
  padding: 36rpx 32rpx;
  color: #fff;
}

.avatar-lg {
  width: 108rpx;
  height: 108rpx;
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
  font-size: 40rpx;
}

.name {
  font-size: 34rpx;
  font-weight: 700;
}

.phone {
  font-size: 24rpx;
  opacity: 0.8;
  margin-top: 4rpx;
}

.level {
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
  font-size: 24rpx;
}

.profile-stats {
  display: flex;
  margin-top: 32rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.2);
}

.pstat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pnum {
  font-size: 32rpx;
  font-weight: 700;
}

.plabel {
  font-size: 22rpx;
  opacity: 0.8;
}

.menu {
  margin-top: 24rpx;
  padding: 0 28rpx;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 0;
  font-size: 28rpx;
  color: $text-strong;
}

.menu-item + .menu-item {
  border-top: 1rpx solid $border;
}

.arrow {
  color: #cbd2dc;
  font-size: 34rpx;
}

.history {
  display: flex;
  align-items: center;
  padding: 22rpx 0;
}

.history + .history {
  border-top: 1rpx solid $border;
}

.history-title {
  font-size: 28rpx;
  color: $text-strong;
}

.history-score {
  font-size: 32rpx;
  font-weight: 700;
  color: $brand;
}

.history-total {
  font-size: 22rpx;
  color: $text-muted;
  font-weight: 400;
}

.logout {
  margin: 40rpx 0 24rpx;
  text-align: center;
  font-size: 28rpx;
  color: $danger;
}

.lang-switch {
  display: flex;
  gap: 12rpx;
}

.lang-pill {
  padding: 8rpx 24rpx;
  border-radius: 999rpx;
  background: $bg-page;
  color: $text;
  font-size: 24rpx;
}

.lang-pill.active {
  background: $brand;
  color: #fff;
  font-weight: 600;
}
</style>
