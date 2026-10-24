<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app';
import { loadMe, session } from '@/lib/session';
import { syncTabBar, syncNavTitle } from '@/lib/i18n';

onLaunch(() => {
  void loadMe();
  syncTabBar();
});

onShow(() => {
  // H5 刷新后内存态丢失，补一次
  if (!session.me) void loadMe();
  // 页面切换后 tabBar / 导航标题跟随当前语言
  syncTabBar();
  syncNavTitle();
});
</script>

<style lang="scss">
page {
  background: $bg-page;
  color: $text;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', sans-serif;
  font-size: 28rpx;
  line-height: 1.5;
  overflow-x: hidden;
}

.page {
  min-height: 100vh;
  padding: 24rpx 24rpx 48rpx;
  box-sizing: border-box;
}

.card {
  background: #fff;
  border-radius: $radius-card;
  padding: 28rpx;
  box-shadow: 0 2rpx 12rpx rgba(16, 24, 40, 0.04);
}

.card + .card {
  margin-top: 24rpx;
}

.row {
  display: flex;
  align-items: center;
}

.between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.grow {
  flex: 1;
  min-width: 0;
}

.muted {
  color: $text-muted;
  font-size: 24rpx;
}

.strong {
  color: $text-strong;
  font-weight: 600;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 32rpx 8rpx 16rpx;
  color: $text-strong;
  font-size: 30rpx;
  font-weight: 600;
}

.section-title .more {
  color: $text-muted;
  font-size: 24rpx;
  font-weight: 400;
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 4rpx 14rpx;
  border-radius: $radius-pill;
  font-size: 22rpx;
  line-height: 1.6;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border-radius: $radius-pill;
  font-size: 30rpx;
  font-weight: 600;
}

.btn::after {
  border: none;
}

.btn-primary {
  background: linear-gradient(135deg, $brand 0%, $brand-deep 100%);
  color: #fff;
}

.btn-primary[disabled] {
  opacity: 0.5;
}

.btn-ghost {
  background: $brand-soft;
  color: $brand-deep;
}

.btn-sm {
  height: 64rpx;
  padding: 0 28rpx;
  font-size: 26rpx;
}

.avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: $brand-soft;
  color: $brand-deep;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34rpx;
  font-weight: 600;
  overflow: hidden;
}

.avatar image {
  width: 100%;
  height: 100%;
}

.empty {
  padding: 120rpx 0;
  text-align: center;
  color: $text-muted;
  font-size: 26rpx;
}

.divider {
  height: 1rpx;
  background: $border;
  margin: 24rpx 0;
}

.brand-gradient {
  background: linear-gradient(135deg, $brand 0%, $brand-deep 60%, #0a5c37 100%);
}
</style>
