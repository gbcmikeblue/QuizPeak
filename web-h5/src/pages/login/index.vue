<script setup lang="ts">
import { ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { api } from '@/lib/api';
import { loginByPassword, loginBySms } from '@/lib/session';
import { syncNavTitle, tt } from '@/lib/i18n';

const TAB_PAGES = ['/pages/index/index', '/pages/quizzes/index', '/pages/leaderboard/index', '/pages/me/index'];

const mode = ref<'sms' | 'password'>('sms');
const phone = ref('');
const code = ref('');
const account = ref('');
const password = ref('');
const sending = ref(false);
const submitting = ref(false);
const countdown = ref(0);
const devCode = ref('');
const redirect = ref('');

let timer: ReturnType<typeof setInterval> | null = null;

onLoad((options) => {
  redirect.value = (options?.redirect as string) ?? '';
});

onShow(() => {
  syncNavTitle();
});

function startCountdown() {
  if (timer) clearInterval(timer);
  countdown.value = 60;
  timer = setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  }, 1000);
}

async function sendCode() {
  if (sending.value || countdown.value > 0) return;
  if (!/^1[3-9]\d{9}$/.test(phone.value)) {
    uni.showToast({ title: tt('请输入正确的手机号'), icon: 'none' });
    return;
  }
  sending.value = true;
  try {
    const res = await api.sendSmsCode(phone.value, 'LOGIN');
    startCountdown();
    if (res.devCode) {
      devCode.value = res.devCode;
      code.value = res.devCode;
      uni.showToast({
        title: `${tt('开发模式验证码')} ${res.devCode}`,
        icon: 'none',
      });
    } else {
      uni.showToast({ title: tt('验证码已发送'), icon: 'none' });
    }
  } catch (err) {
    uni.showToast({ title: (err as Error).message, icon: 'none' });
  } finally {
    sending.value = false;
  }
}

function afterLogin() {
  const target = redirect.value;
  if (target && TAB_PAGES.includes(target)) {
    uni.switchTab({ url: target });
    return;
  }
  if (target) {
    uni.redirectTo({
      url: target,
      fail: () => uni.switchTab({ url: '/pages/index/index' }),
    });
    return;
  }
  const pages = getCurrentPages();
  if (pages.length > 1) uni.navigateBack();
  else uni.switchTab({ url: '/pages/index/index' });
}

async function submit() {
  if (submitting.value) return;
  submitting.value = true;
  try {
    if (mode.value === 'sms') {
      if (!/^1[3-9]\d{9}$/.test(phone.value)) throw new Error(tt('请输入正确的手机号'));
      if (!/^\d{6}$/.test(code.value)) throw new Error(tt('请输入 6 位验证码'));
      await loginBySms(phone.value, code.value);
    } else {
      if (!account.value.trim() || !password.value) throw new Error(tt('请输入账号与密码'));
      await loginByPassword(account.value.trim(), password.value);
    }
    uni.showToast({ title: tt('登录成功'), icon: 'none' });
    setTimeout(afterLogin, 300);
  } catch (err) {
    uni.showToast({ title: (err as Error).message, icon: 'none' });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <view class="page login-page">
    <view class="brand">
      <view class="brand-title">知巅 QuizPeak</view>
      <view class="brand-slogan">{{ tt('答题登顶，积分上榜') }}</view>
    </view>

    <view class="tabs">
      <view class="tab" :class="{ active: mode === 'sms' }" @tap="mode = 'sms'">{{ tt('验证码登录') }}</view>
      <view class="tab" :class="{ active: mode === 'password' }" @tap="mode = 'password'">{{ tt('密码登录') }}</view>
    </view>

    <view class="card form">
      <template v-if="mode === 'sms'">
        <view class="field">
          <text class="label">{{ tt('手机号') }}</text>
          <input v-model="phone" class="input" type="number" maxlength="11" :placeholder="tt('输入手机号')" />
        </view>
        <view class="field">
          <text class="label">{{ tt('验证码') }}</text>
          <view class="code-row">
            <input v-model="code" class="input grow" type="number" maxlength="6" :placeholder="tt('6 位验证码')" />
            <view class="code-btn" :class="{ disabled: countdown > 0 || sending }" @tap="sendCode">
              {{ countdown > 0 ? `${countdown}s` : sending ? tt('发送中…') : tt('获取验证码') }}
            </view>
          </view>
        </view>
        <view class="hint">{{ tt('未注册的手机号将自动创建账号并赠送新人积分') }}</view>
      </template>

      <template v-else>
        <view class="field">
          <text class="label">{{ tt('账号') }}</text>
          <input v-model="account" class="input" type="text" :placeholder="tt('手机号 / 邮箱 / 用户名')" />
        </view>
        <view class="field">
          <text class="label">{{ tt('密码') }}</text>
          <input v-model="password" class="input" type="password" :placeholder="tt('请输入密码')" />
        </view>
      </template>

      <button class="btn btn-primary submit" :disabled="submitting" @tap="submit">
        {{ submitting ? tt('登录中…') : tt('登录') }}
      </button>

      <view class="agree">{{ tt('登录即表示同意《用户协议》与《隐私政策》') }}</view>
    </view>

    <view class="tips">
      <view>{{ tt('开发环境验证码会直接返回并自动填入') }}</view>
      <view>{{ tt('也可用 PC 端注册的账号走密码登录') }}</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.login-page {
  padding-top: 80rpx;
}

.brand {
  text-align: center;
  margin-bottom: 56rpx;
}

.brand-title {
  font-size: 48rpx;
  font-weight: 800;
  color: $brand-deep;
  letter-spacing: 2rpx;
}

.brand-slogan {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: $text-muted;
}

.tabs {
  display: flex;
  background: #fff;
  border-radius: 999rpx;
  padding: 8rpx;
  margin-bottom: 24rpx;
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

.form {
  padding: 32rpx;
}

.field + .field {
  margin-top: 28rpx;
}

.label {
  font-size: 24rpx;
  color: $text-muted;
}

.input {
  margin-top: 10rpx;
  height: 84rpx;
  background: $bg-page;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: $text-strong;
}

.code-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 10rpx;
}

.code-row .input {
  margin-top: 0;
}

.code-btn {
  height: 84rpx;
  padding: 0 24rpx;
  border-radius: 12rpx;
  background: $brand-soft;
  color: $brand-deep;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.code-btn.disabled {
  opacity: 0.55;
}

.hint {
  margin-top: 24rpx;
  font-size: 22rpx;
  color: $text-muted;
  line-height: 1.6;
}

.submit {
  margin-top: 40rpx;
}

.agree {
  margin-top: 24rpx;
  text-align: center;
  font-size: 22rpx;
  color: $text-muted;
}

.tips {
  margin-top: 40rpx;
  text-align: center;
  font-size: 22rpx;
  color: #98a2b3;
  line-height: 1.9;
}
</style>
