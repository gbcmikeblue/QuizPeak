import { BadRequestException, Body, Controller, Get, Injectable, Module, Param, Post } from '@nestjs/common';
import type { User } from '@prisma/client';
import rawWords from 'an-array-of-english-words';
import { z } from 'zod';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { NotificationsService } from '../notifications/notifications.module';
import { PointsService } from '../points/points.service';
import { PrismaService } from '../prisma/prisma.service';

/** 词库：按变体长度分组（真实项目应放词典表，这里先内置常用词） */
const WORDS: Record<string, string[]> = {
  min: ['cat', 'dog', 'sun', 'map', 'key', 'ice', 'oil', 'sky', 'tea', 'win', 'box', 'fly', 'hat', 'jam', 'net'],
  normal: [
    'about', 'apple', 'brain', 'chair', 'dance', 'earth', 'flame', 'ghost', 'house', 'input',
    'joker', 'knife', 'light', 'money', 'night', 'ocean', 'piano', 'queen', 'radio', 'smile',
    'table', 'unity', 'voice', 'water', 'youth', 'zebra', 'cloud', 'dream', 'eagle', 'frost',
  ],
  max: [
    'ability', 'balance', 'captain', 'diamond', 'element', 'fortune', 'gallery', 'harvest',
    'imagine', 'journey', 'kingdom', 'library', 'machine', 'natural', 'observe', 'picture',
    'quality', 'respect', 'science', 'teacher', 'uniform', 'village', 'weather', 'picture',
  ],
};

const VARIANTS: Record<string, { length: number; label: string; maxGuesses: number }> = {
  min: { length: 3, label: 'Wordling Min', maxGuesses: 6 },
  normal: { length: 5, label: 'Wordling', maxGuesses: 6 },
  max: { length: 7, label: 'Wordling Max', maxGuesses: 7 },
};

type State = 'correct' | 'present' | 'absent';

/** Hexling：每天 16 个字母，拼出 4 字母以上的单词得分 */
const HEX_LETTER_SETS = [
  'aeiounrstlcdmphg',
  'aeioulrstdcnmpgb',
  'aeiouyhntrslcdmp',
  'aeiouwklmnstrdcp',
  'aeioufghlnrstcdp',
];
const HEX_DURATION_SEC = 90;
/** 得分门槛：达到后发放积分奖励 */
const HEX_REWARD_THRESHOLD = 40;

/** 英文词典（启动时构建，只保留 4~12 字母的小写单词） */
const HEX_DICT: Set<string> = new Set(
  rawWords.filter((w) => w.length >= 4 && w.length <= 12 && /^[a-z]+$/.test(w)),
);

/** 单词长度 -> 分数 */
function wordScore(word: string): number {
  if (word.length >= 8) return 8;
  if (word.length === 7) return 5;
  if (word.length === 6) return 3;
  if (word.length === 5) return 2;
  return 1;
}

@Injectable()
export class GamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly points: PointsService,
    private readonly notifications: NotificationsService,
  ) {}

  private today(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
  }

  private pickAnswer(variant: string): string {
    const pool = WORDS[variant] ?? WORDS.normal;
    const idx = Math.floor(new Date().getTime() / 86400000) % pool.length;
    return pool[idx];
  }

  /** 今日状态 */
  async wordling(userId: string, variant: string) {
    const meta = VARIANTS[variant];
    if (!meta) throw new BadRequestException('不支持的玩法');

    const record = await this.prisma.gameRecord.findFirst({
      where: { userId, game: `WORDLING_${variant.toUpperCase()}`, playDate: this.today() },
    });
    const result = (record?.result ?? {}) as { guesses?: string[][]; finished?: boolean; won?: boolean };

    return {
      variant,
      label: meta.label,
      length: meta.length,
      maxGuesses: meta.maxGuesses,
      guesses: result.guesses ?? [],
      finished: Boolean(result.finished),
      won: Boolean(result.won),
      reward: record?.rewardPoints ?? 0,
    };
  }

  /** 提交一次猜测 */
  async guess(userId: string, variant: string, guessRaw: string) {
    const meta = VARIANTS[variant];
    if (!meta) throw new BadRequestException('不支持的玩法');

    const guess = guessRaw.trim().toLowerCase();
    if (!/^[a-z]+$/.test(guess) || guess.length !== meta.length) {
      throw new BadRequestException(`请输入 ${meta.length} 个字母的英文单词`);
    }

    const game = `WORDLING_${variant.toUpperCase()}`;
    const playDate = this.today();
    const record = await this.prisma.gameRecord.findFirst({ where: { userId, game, playDate } });
    const result = (record?.result ?? { guesses: [], finished: false }) as {
      guesses: string[][];
      finished?: boolean;
      won?: boolean;
    };
    if (result.finished) throw new BadRequestException('今天的这一局已结束，明天再来');

    const answer = this.pickAnswer(variant);
    const states: State[] = [];
    const pool = answer.split('');
    guess.split('').forEach((ch, i) => {
      if (answer[i] === ch) {
        states.push('correct');
        pool[i] = '';
      } else if (pool.includes(ch)) {
        states.push('present');
        pool[pool.indexOf(ch)] = '';
      } else {
        states.push('absent');
      }
    });

    const guesses = [...(result.guesses ?? []), states.map((s, i) => `${guess[i]}:${s}`)];
    const won = guess === answer;
    const finished = won || guesses.length >= meta.maxGuesses;
    const reward = finished && won ? await this.points.rule('points.game_reward', 20) : 0;
    const rewardPoints = finished ? reward : 0;

    const payload = { guesses, finished, won };
    if (record) {
      await this.prisma.gameRecord.update({ where: { id: record.id }, data: { result: payload, rewardPoints } });
    } else {
      await this.prisma.gameRecord.create({ data: { userId, game, playDate, result: payload, rewardPoints } });
    }

    if (rewardPoints > 0) {
      await this.points.change({
        userId,
        delta: rewardPoints,
        type: 'QUIZ_REWARD',
        refType: 'game',
        refId: `${game}:${playDate}`,
        remark: `${meta.label} 猜中奖励`,
      });
      await this.notifications.push(userId, 'GAME', `${meta.label} 猜中了！`, `获得 ${rewardPoints} 积分`, '/games');
    }

    return {
      states,
      correct: won,
      attemptsLeft: Math.max(meta.maxGuesses - guesses.length, 0),
      finished,
      answer: finished ? answer : undefined,
      reward: rewardPoints,
    };
  }
  /** Hexling 今日状态 */
  async hexling(userId: string) {
    const record = await this.prisma.gameRecord.findFirst({
      where: { userId, game: 'HEXLING', playDate: this.today() },
    });
    const result = (record?.result ?? {}) as {
      words?: Array<{ word: string; score: number }>;
      score?: number;
    };

    return {
      letters: hexLetters(),
      durationSec: HEX_DURATION_SEC,
      minLength: 4,
      rewardThreshold: HEX_REWARD_THRESHOLD,
      played: Boolean(record),
      words: result.words ?? [],
      score: result.score ?? 0,
      reward: record?.rewardPoints ?? 0,
    };
  }

  /** Hexling 一局一次提交：校验字母可用性、去重、按长度计分 */
  async submitHexling(userId: string, words: string[]) {
    const playDate = this.today();
    const exists = await this.prisma.gameRecord.findFirst({ where: { userId, game: 'HEXLING', playDate } });
    if (exists) throw new BadRequestException('今天已经提交过了，明天再来');

    const pool = new Map<string, number>();
    for (const ch of hexLetters()) pool.set(ch, (pool.get(ch) ?? 0) + 1);

    const accepted: Array<{ word: string; score: number }> = [];
    const rejected: Array<{ word: string; reason: string }> = [];
    const seen = new Set<string>();

    for (const raw of words) {
      const word = raw.trim().toLowerCase();
      if (!word) continue;
      if (seen.has(word)) {
        rejected.push({ word, reason: '重复单词' });
        continue;
      }
      if (!/^[a-z]+$/.test(word)) {
        rejected.push({ word, reason: '只能包含字母' });
        continue;
      }
      if (word.length < 4) {
        rejected.push({ word, reason: '至少 4 个字母' });
        continue;
      }
      if (!HEX_DICT.has(word)) {
        rejected.push({ word, reason: '不在英文词典中' });
        continue;
      }

      const used = new Map(pool);
      let ok = true;
      for (const ch of word) {
        const left = used.get(ch) ?? 0;
        if (left <= 0) {
          ok = false;
          break;
        }
        used.set(ch, left - 1);
      }
      if (!ok) {
        rejected.push({ word, reason: '字母不在今日拼盘中' });
        continue;
      }

      seen.add(word);
      accepted.push({ word, score: wordScore(word) });
    }

    const score = accepted.reduce((sum, w) => sum + w.score, 0);
    const reward = score >= HEX_REWARD_THRESHOLD ? await this.points.rule('points.game_reward', 20) : 0;

    await this.prisma.gameRecord.create({
      data: { userId, game: 'HEXLING', playDate, result: { words: accepted, score }, rewardPoints: reward },
    });

    if (reward > 0) {
      await this.points.change({
        userId,
        delta: reward,
        type: 'QUIZ_REWARD',
        refType: 'game',
        refId: `HEXLING:${playDate}`,
        remark: 'Hexling 拼词奖励',
      });
      await this.notifications.push(
        userId,
        'GAME',
        `Hexling 完成，得分 ${score}`,
        `拼出 ${accepted.length} 个单词，获得 ${reward} 积分`,
        '/games',
        'HEXLING',
      );
    }

    return { accepted, rejected, score, reward };
  }
}

/** Hexling 每日字母（按自然日轮换） */
export function hexLetters(day = new Date()): string[] {
  const epochDay = Math.floor(day.getTime() / 86400000);
  const set = HEX_LETTER_SETS[epochDay % HEX_LETTER_SETS.length];
  return set.split('');
}

@Controller('games')
export class GamesController {
  constructor(private readonly games: GamesService) {}

  @Get('wordling/:variant')
  wordling(@CurrentUser() user: User, @Param('variant') variant: string) {
    return this.games.wordling(user.id, variant);
  }

  @Get('hexling')
  hexling(@CurrentUser() user: User) {
    return this.games.hexling(user.id);
  }

  @Post('hexling/submit')
  submitHexling(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(z.object({ words: z.array(z.string().max(20)).max(80) })))
    body: { words: string[] },
  ) {
    return this.games.submitHexling(user.id, body.words);
  }

  @Post('wordling/:variant/guess')
  guess(
    @CurrentUser() user: User,
    @Param('variant') variant: string,
    @Body(new ZodValidationPipe(z.object({ guess: z.string().min(1).max(20) }))) body: { guess: string },
  ) {
    return this.games.guess(user.id, variant, body.guess);
  }
}

@Module({
  controllers: [GamesController],
  providers: [GamesService],
})
export class GamesModule {}
