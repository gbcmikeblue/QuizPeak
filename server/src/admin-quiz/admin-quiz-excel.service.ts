import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { QuestionType } from '@prisma/client';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';

const HEADERS = ['关卡号', '题型', '题干', '选项A', '选项B', '选项C', '选项D', '正确答案', '解析', '分值'];

const TYPE_TO_ZH: Record<string, string> = {
  SINGLE: '单选',
  MULTI: '多选',
  TRUE_FALSE: '判断',
  FILL: '填空',
};

const ZH_TO_TYPE: Record<string, QuestionType> = {
  单选: QuestionType.SINGLE,
  单选题: QuestionType.SINGLE,
  SINGLE: QuestionType.SINGLE,
  多选: QuestionType.MULTI,
  多选题: QuestionType.MULTI,
  MULTI: QuestionType.MULTI,
  判断: QuestionType.TRUE_FALSE,
  判断题: QuestionType.TRUE_FALSE,
  TRUE_FALSE: QuestionType.TRUE_FALSE,
  填空: QuestionType.FILL,
  填空题: QuestionType.FILL,
  FILL: QuestionType.FILL,
};

const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

interface QuestionOption {
  key: string;
  text: string;
}

@Injectable()
export class AdminQuizExcelService {
  constructor(private readonly prisma: PrismaService) {}

  /** 导出：题库下所有关卡与题目 */
  async exportQuiz(quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        levels: {
          orderBy: { levelNo: 'asc' },
          include: { questions: { orderBy: { sort: 'asc' } } },
        },
      },
    });
    if (!quiz) throw new NotFoundException('题库不存在');

    const rows: Array<Array<string | number>> = [HEADERS];
    for (const level of quiz.levels) {
      for (const q of level.questions) {
        const options = (q.options as unknown as QuestionOption[]) ?? [];
        const answer = (q.answer as unknown as string[]) ?? [];
        const isJudge = q.type === QuestionType.TRUE_FALSE;

        rows.push([
          level.levelNo,
          TYPE_TO_ZH[q.type] ?? q.type,
          q.stem,
          isJudge ? '正确' : (options[0]?.text ?? ''),
          isJudge ? '错误' : (options[1]?.text ?? ''),
          isJudge ? '' : (options[2]?.text ?? ''),
          isJudge ? '' : (options[3]?.text ?? ''),
          isJudge ? (answer[0] === 'T' ? '对' : '错') : answer.join(','),
          q.analysis ?? '',
          q.score,
        ]);
      }
    }

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet['!cols'] = [8, 8, 46, 18, 18, 18, 18, 12, 40, 8].map((w) => ({ wch: w }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, '题目');
    const buffer = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    return {
      filename: `${quiz.title}-题目.xlsx`,
      base64: buffer.toString('base64'),
      count: rows.length - 1,
    };
  }

  /** 提供空白模板（含一行示例） */
  template() {
    const rows = [
      HEADERS,
      [1, '单选', '示例：以下哪个是 HTTP 状态码 404 的含义？', '未找到', '服务器错误', '重定向', '请求超时', 'A', '404 表示资源不存在', 10],
      [1, '多选', '示例：以下哪些属于前端框架？', 'React', 'Vue', 'Laravel', 'Angular', 'A,B,D', 'Laravel 是 PHP 框架', 10],
      [2, '判断', '示例：HTTPS 默认端口是 443。', '正确', '错误', '', '', '对', '', 10],
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet['!cols'] = [8, 8, 46, 18, 18, 18, 18, 12, 40, 8].map((w) => ({ wch: w }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, '题目');
    const buffer = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    return { filename: '题库导入模板.xlsx', base64: buffer.toString('base64') };
  }

  /** 导入：按「关卡号」归入对应关卡，关卡不存在则自动创建 */
  async importQuiz(quizId: string, fileBase64: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) throw new NotFoundException('题库不存在');

    const raw = fileBase64.replace(/^data:[^;]+;base64,/, '');
    let rows: unknown[][] = [];
    try {
      const book = XLSX.read(Buffer.from(raw, 'base64'), { type: 'buffer' });
      const sheet = book.Sheets[book.SheetNames[0]];
      if (!sheet) throw new Error('没有工作表');
      rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
    } catch {
      throw new BadRequestException('无法解析文件，请确认是 .xlsx 或 .xls');
    }

    if (rows.length === 0) throw new BadRequestException('文件内容为空');

    // 跳过表头行
    const first = rows[0]?.map((c) => String(c ?? '').trim()) ?? [];
    const dataRows = first.includes('题干') ? rows.slice(1) : rows;
    if (dataRows.length === 0) throw new BadRequestException('没有可导入的数据行');
    if (dataRows.length > 1000) throw new BadRequestException('单次最多导入 1000 行');

    const errors: Array<{ row: number; message: string }> = [];
    const levelIds = new Map<number, string>();
    const levelSort = new Map<string, number>();
    let created = 0;
    let levelsCreated = 0;

    for (let i = 0; i < dataRows.length; i += 1) {
      const rowNo = i + (first.includes('题干') ? 2 : 1);
      const cells = dataRows[i] ?? [];
      const text = (idx: number) => String(cells[idx] ?? '').trim();

      try {
        const levelNo = Number(text(0));
        const stem = text(2);
        const type = ZH_TO_TYPE[text(1)] ?? null;

        if (!Number.isInteger(levelNo) || levelNo < 1 || levelNo > 50) throw new Error('关卡号需为 1~50 的整数');
        if (!stem) throw new Error('题干不能为空');
        if (!type) throw new Error(`无法识别的题型「${text(1)}」，请用 单选/多选/判断/填空`);

        // 关卡：按需创建
        let levelId = levelIds.get(levelNo);
        if (!levelId) {
          let level = await this.prisma.quizLevel.findUnique({ where: { quizId_levelNo: { quizId, levelNo } } });
          if (!level) {
            level = await this.prisma.quizLevel.create({
              data: { quizId, levelNo, questionCount: 0, passThreshold: quiz.unlockThreshold ?? 60 },
            });
            levelsCreated += 1;
          }
          levelId = level.id;
          levelIds.set(levelNo, level.id);
        }

        // 选项与答案
        let options: QuestionOption[] = [];
        let answer: string[] = [];

        if (type === QuestionType.TRUE_FALSE) {
          const zh = text(7);
          const isTrue = ['对', '正确', 'T', 'TRUE', 'TRUE_', '是', '1'].includes(zh.toUpperCase()) || zh === '对';
          if (!zh) throw new Error('判断题请在「正确答案」填 对 / 错');
          options = [
            { key: 'T', text: '正确' },
            { key: 'F', text: '错误' },
          ];
          answer = [isTrue ? 'T' : 'F'];
        } else if (type === QuestionType.FILL) {
          if (!text(7)) throw new Error('填空题请在「正确答案」填答案文本');
          answer = [text(7)];
        } else {
          const texts = [text(3), text(4), text(5), text(6)].filter(Boolean);
          if (texts.length < 2) throw new Error('选择题至少需要 2 个选项');
          options = texts.map((t, idx) => ({ key: OPTION_KEYS[idx] as string, text: t }));

          const letters = text(7)
            .toUpperCase()
            .split(/[,，\s]+/)
            .filter(Boolean);
          if (letters.length === 0) throw new Error('请填写正确答案（如 A 或 A,C）');
          for (const letter of letters) {
            if (!options.some((o) => o.key === letter)) throw new Error(`答案 ${letter} 不在选项范围内`);
          }
          if (type === QuestionType.SINGLE && letters.length > 1) throw new Error('单选题只能有一个答案');
          answer = letters.sort();
        }

        const maxSort = levelSort.get(levelId ?? '');
        let sort = maxSort;
        if (sort === undefined) {
          const last = await this.prisma.question.findFirst({
            where: { levelId: levelId ?? undefined },
            orderBy: { sort: 'desc' },
            select: { sort: true },
          });
          sort = last?.sort ?? 0;
        }
        sort += 1;
        levelSort.set(levelId as string, sort);

        await this.prisma.question.create({
          data: {
            quizId,
            levelId,
            type,
            stem,
            options: options as unknown as object,
            answer: answer as unknown as object,
            analysis: text(8) || null,
            score: Number(text(9)) > 0 ? Number(text(9)) : 10,
            sort,
            enabled: true,
          },
        });
        created += 1;
      } catch (error) {
        errors.push({ row: rowNo, message: (error as Error).message });
      }
    }

    // 同步关卡题数
    for (const [, levelId] of levelIds) {
      const count = await this.prisma.question.count({ where: { levelId } });
      await this.prisma.quizLevel.update({ where: { id: levelId }, data: { questionCount: count } });
    }

    return {
      created,
      failed: errors.length,
      levelsCreated,
      errors: errors.slice(0, 20),
    };
  }
}
