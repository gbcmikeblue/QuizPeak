<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app';
import { api, type AnswerResult, type FinishResult, type PlayData, type PlayQuestion } from '@/lib/api';
import { loadMe } from '@/lib/session';
import { mmss } from '@/lib/format';
import { syncNavTitle, tt } from '@/lib/i18n';

const quizId = ref('');
const levelNo = ref(1);

const attempt = ref<PlayData | null>(null);
const index = ref(0);
const selected = ref<string[]>([]);
const fillText = ref('');
const feedback = ref<AnswerResult | null>(null);
const finished = ref<FinishResult | null>(null);
const remain = ref(0);
const busy = ref(false);
const error = ref('');
const skippedIds = ref<string[]>([]);

let timer: ReturnType<typeof setInterval> | null = null;

const current = computed<PlayQuestion | null>(() => attempt.value?.questions[index.value] ?? null);
const total = computed(() => attempt.value?.questions.length ?? 0);
const progressPct = computed(() => (total.value ? ((index.value + 1) / total.value) * 100 : 0));

const isMulti = computed(() => current.value?.type === 'MULTI');
const isFill = computed(() => current.value?.type === 'FILL');

function stopTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function startTimer() {
  stopTimer();
  if (!attempt.value) return;
  remain.value = attempt.value.questionSeconds || 120;
  timer = setInterval(() => {
    remain.value -= 1;
    if (remain.value <= 0) {
      stopTimer();
      void autoNext();
    }
  }, 1000);
}

async function autoNext() {
  if (feedback.value) {
    next();
    return;
  }
  if (selected.value.length > 0) await submit();
  else await skipQuestion();
}

function resetQuestion() {
  selected.value = [];
  fillText.value = '';
  feedback.value = null;
  startTimer();
}

/** 断点续答：跳到第一道未作答的题 */
function firstUnanswered(data: PlayData): number {
  const doneIds = new Set(data.answered.map((a) => a.questionId));
  const idx = data.questions.findIndex((q) => !doneIds.has(q.id));
  return idx === -1 ? 0 : idx;
}

async function load() {
  error.value = '';
  try {
    const data = await api.startAttempt(quizId.value, levelNo.value);
    attempt.value = data;
    index.value = firstUnanswered(data);
    resetQuestion();
  } catch (err) {
    error.value = (err as Error).message;
  }
}

onLoad((options) => {
  quizId.value = (options?.id as string) ?? '';
  levelNo.value = Number(options?.level ?? 1);
  if (!quizId.value) {
    error.value = tt('缺少题库 ID');
    return;
  }
  void load();
});

onShow(() => syncNavTitle());

onUnload(() => stopTimer());

function toggleOption(key: string) {
  if (feedback.value || busy.value) return;
  if (isMulti.value) {
    selected.value = selected.value.includes(key)
      ? selected.value.filter((k) => k !== key)
      : [...selected.value, key];
  } else {
    selected.value = [key];
  }
}

async function submit() {
  const q = current.value;
  if (!q || busy.value) return;
  const answer = isFill.value ? [fillText.value.trim()] : selected.value;
  if (answer.length === 0 || (isFill.value && !answer[0])) {
    uni.showToast({ title: tt('请先作答'), icon: 'none' });
    return;
  }

  busy.value = true;
  try {
    const res = await api.answer(attempt.value!.attemptId, q.id, answer, attempt.value!.questionSeconds - remain.value);
    feedback.value = res;
    stopTimer();
  } catch (err) {
    uni.showToast({ title: (err as Error).message, icon: 'none' });
  } finally {
    busy.value = false;
  }
}

async function skipQuestion() {
  const q = current.value;
  if (!q || busy.value) return;
  busy.value = true;
  try {
    await api.skip(attempt.value!.attemptId, q.id);
    skippedIds.value = [...skippedIds.value, q.id];
    stopTimer();
    next();
  } catch (err) {
    uni.showToast({ title: (err as Error).message, icon: 'none' });
  } finally {
    busy.value = false;
  }
}

function next() {
  if (index.value < total.value - 1) {
    index.value += 1;
    resetQuestion();
    return;
  }
  void finishNow();
}

async function finishNow() {
  if (!attempt.value || busy.value) return;
  busy.value = true;
  stopTimer();
  try {
    finished.value = await api.finishAttempt(attempt.value.attemptId);
    void loadMe(true);
  } catch (err) {
    uni.showToast({ title: (err as Error).message, icon: 'none' });
  } finally {
    busy.value = false;
  }
}

function exit() {
  if (finished.value) {
    uni.navigateBack();
    return;
  }
  uni.showModal({
    title: tt('退出答题'),
    content: tt('当前进度会保留，下次从这一关继续。'),
    confirmText: tt('退出'),
    success: (res) => {
      if (res.confirm) uni.navigateBack();
    },
  });
}

function backToQuiz() {
  uni.redirectTo({ url: `/pages/quiz/detail?id=${quizId.value}` });
}

function retry() {
  finished.value = null;
  attempt.value = null;
  index.value = 0;
  void load();
}
</script>

<template>
  <view class="play">
    <!-- 顶栏 -->
    <view class="topbar" :style="{ paddingTop: 'var(--status-bar-height)' }">
      <text class="close" @tap="exit">✕</text>
      <view class="grow">
        <view class="bar-title">{{ attempt?.quiz.title ?? tt('答题') }}</view>
        <view class="bar-sub">
          {{ tt('第 {n} 关', { n: levelNo }) }} · {{ Math.min(index + 1, total || 1) }}/{{ total || '—' }}
        </view>
      </view>
      <view class="timer" :class="{ danger: remain <= 10 && !feedback }">{{ mmss(remain) }}</view>
    </view>

    <view v-if="error" class="card" style="margin: 24rpx">{{ error }}</view>

    <!-- 答题中 -->
    <view v-if="attempt && !finished" class="body">
      <view class="progress">
        <view class="progress-inner" :style="{ width: `${progressPct}%` }" />
      </view>

      <view class="stem-card">
        <view class="stem-type">
          {{
            current?.type === 'MULTI'
              ? tt('多选题')
              : current?.type === 'FILL'
                ? tt('填空题')
                : current?.type === 'TRUE_FALSE'
                  ? tt('判断题')
                  : tt('单选题')
          }}
          <text class="stem-score">{{ tt('{n} 分', { n: current?.score ?? 0 }) }}</text>
        </view>
        <view class="stem">{{ current?.stem }}</view>
      </view>

      <view class="options">
        <view v-if="isFill">
          <input
            v-model="fillText"
            class="fill-input"
            type="text"
            :placeholder="tt('请输入答案')"
            :disabled="!!feedback"
          />
        </view>

        <view
          v-for="opt in current?.options ?? []"
          :key="opt.key"
          class="option"
          :class="{
            picked: selected.includes(opt.key),
            correct: feedback && feedback.correctAnswer.includes(opt.key),
            wrong: feedback && selected.includes(opt.key) && !feedback.correctAnswer.includes(opt.key),
          }"
          @tap="toggleOption(opt.key)"
        >
          <view class="option-key">{{ opt.key }}</view>
          <view class="option-text">{{ opt.text }}</view>
        </view>
      </view>

      <!-- 判分反馈 -->
      <view v-if="feedback" class="feedback" :class="feedback.isCorrect ? 'ok' : 'bad'">
        <view class="fb-title">
          {{
            feedback.isCorrect
              ? tt('答对了 +{n}', { n: feedback.score })
              : tt('答错了（正确：{answer}）', { answer: feedback.correctAnswer.join('、') || '—' })
          }}
        </view>
        <view v-if="feedback.analysis" class="fb-analysis">{{ feedback.analysis }}</view>
      </view>

      <view class="actions">
        <button v-if="!feedback" class="btn btn-primary" :disabled="busy" @tap="submit">
          {{ busy ? tt('提交中…') : tt('提交答案') }}
        </button>
        <button v-else class="btn btn-primary" @tap="next">
          {{ index < total - 1 ? tt('下一题') : tt('交卷查看成绩') }}
        </button>
        <view v-if="!feedback" class="skip" @tap="skipQuestion">{{ tt('跳过这题') }}</view>
      </view>
    </view>

    <!-- 成绩 -->
    <view v-if="finished" class="body">
      <view class="result-card">
        <view class="result-rate">{{ finished.rate }}<text class="unit">%</text></view>
        <view class="muted">{{ tt('正确率') }}</view>
        <view class="result-score">
          {{ finished.correctCount }} {{ tt('对') }} / {{ finished.wrongCount }} {{ tt('错') }} ·
          {{ finished.score }}/{{ finished.totalScore }} {{ tt('分') }}
        </view>
        <view class="result-rewards">
          <text v-if="finished.pointsEarned">+{{ finished.pointsEarned }} {{ tt('积分') }}</text>
          <text v-if="finished.xpEarned">+{{ finished.xpEarned }} XP</text>
        </view>
        <view v-if="finished.nextLevelUnlocked" class="unlock-tip">🎉 {{ tt('下一关已解锁') }}</view>
      </view>

      <view class="actions">
        <button class="btn btn-primary" @tap="backToQuiz">{{ tt('返回题库') }}</button>
        <button class="btn btn-ghost" @tap="retry">{{ tt('再答一次') }}</button>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.play {
  min-height: 100vh;
  background: $bg-page;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 24rpx;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
}

.close {
  font-size: 34rpx;
  color: $text-muted;
  padding: 0 8rpx;
}

.bar-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-strong;
}

.bar-sub {
  font-size: 22rpx;
  color: $text-muted;
}

.timer {
  font-size: 30rpx;
  font-weight: 700;
  color: $brand;
  font-variant-numeric: tabular-nums;
}

.timer.danger {
  color: $danger;
}

.body {
  padding: 24rpx;
}

.progress {
  height: 8rpx;
  border-radius: 999rpx;
  background: #e6e9ee;
  overflow: hidden;
}

.progress-inner {
  height: 100%;
  background: linear-gradient(90deg, $brand 0%, #47b881 100%);
  transition: width 0.25s;
}

.stem-card {
  margin-top: 24rpx;
  background: #fff;
  border-radius: $radius-card;
  padding: 32rpx;
}

.stem-type {
  display: flex;
  justify-content: space-between;
  font-size: 22rpx;
  color: $brand-deep;
}

.stem-score {
  color: $text-muted;
}

.stem {
  margin-top: 16rpx;
  font-size: 34rpx;
  font-weight: 600;
  color: $text-strong;
  line-height: 1.55;
}

.options {
  margin-top: 24rpx;
}

.option {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  padding: 28rpx;
  background: #fff;
  border-radius: $radius-card;
  border: 2rpx solid transparent;
  margin-bottom: 16rpx;
  transition: all 0.15s;
}

.option.picked {
  border-color: $brand;
  background: $brand-soft;
}

.option.correct {
  border-color: #2e9e5b;
  background: #eef9f2;
}

.option.wrong {
  border-color: $danger;
  background: #fdf0ef;
}

.option-key {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: $bg-page;
  color: $text;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 600;
  flex-shrink: 0;
}

.option.picked .option-key {
  background: $brand;
  color: #fff;
}

.option.correct .option-key {
  background: #2e9e5b;
  color: #fff;
}

.option.wrong .option-key {
  background: $danger;
  color: #fff;
}

.option-text {
  font-size: 28rpx;
  color: $text-strong;
  line-height: 1.5;
}

.fill-input {
  background: #fff;
  border-radius: $radius-card;
  padding: 28rpx;
  font-size: 28rpx;
  margin-bottom: 16rpx;
}

.feedback {
  margin-top: 24rpx;
  padding: 24rpx;
  border-radius: $radius-card;
  font-size: 26rpx;
  line-height: 1.6;
}

.feedback.ok {
  background: #eef9f2;
  color: #1c7a45;
}

.feedback.bad {
  background: #fdf0ef;
  color: #b42318;
}

.fb-title {
  font-weight: 600;
}

.fb-analysis {
  margin-top: 10rpx;
  opacity: 0.9;
}

.actions {
  margin-top: 40rpx;
  padding-bottom: 40rpx;
}

.actions .btn + .btn {
  margin-top: 20rpx;
}

.skip {
  margin-top: 24rpx;
  text-align: center;
  font-size: 26rpx;
  color: $text-muted;
}

.result-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 56rpx 32rpx;
  text-align: center;
}

.result-rate {
  font-size: 96rpx;
  font-weight: 800;
  color: $brand;
  line-height: 1.1;
}

.result-rate .unit {
  font-size: 40rpx;
  margin-left: 4rpx;
}

.result-score {
  margin-top: 16rpx;
  font-size: 28rpx;
  color: $text-strong;
}

.result-rewards {
  display: flex;
  justify-content: center;
  gap: 24rpx;
  margin-top: 24rpx;
  font-size: 26rpx;
  color: #b54708;
  font-weight: 600;
}

.unlock-tip {
  margin-top: 24rpx;
  padding: 16rpx;
  border-radius: 12rpx;
  background: $brand-cream;
  color: #b54708;
  font-size: 26rpx;
}
</style>
