import { z } from 'zod';
import { ClientCode } from '../enums';

export const phoneSchema = z
  .string()
  .regex(/^1[3-9]\d{9}$/, '手机号格式不正确');

/** 登录端：不传按 PC 处理，用于验证码频控隔离与令牌标记 */
export const clientSchema = z.nativeEnum(ClientCode).optional().default(ClientCode.PC);

export const passwordSchema = z
  .string()
  .min(8, '密码至少 8 位')
  .max(32, '密码最多 32 位')
  .regex(/[A-Za-z]/, '密码需包含字母')
  .regex(/\d/, '密码需包含数字');

export const smsCodeSchema = z.string().regex(/^\d{6}$/, '验证码为 6 位数字');

export const sendSmsCodeSchema = z.object({
  phone: phoneSchema,
  scene: z.enum(['LOGIN', 'REGISTER', 'RESET_PASSWORD', 'BIND_PHONE']),
  /** 端：各端发送频控互相独立 */
  client: clientSchema,
});

export const smsLoginSchema = z.object({
  phone: phoneSchema,
  code: smsCodeSchema,
  inviteCode: z.string().max(32).optional(),
  client: clientSchema,
});

export const passwordLoginSchema = z.object({
  account: z.string().min(3, '请输入手机号/邮箱/用户名').max(64),
  password: z.string().min(1, '请输入密码'),
  client: clientSchema,
});

export const registerSchema = z
  .object({
    phone: phoneSchema,
    code: smsCodeSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    nickname: z.string().min(1, '请输入昵称').max(24).optional(),
    inviteCode: z.string().max(32).optional(),
    client: clientSchema,
    agreeTerms: z.literal(true, {
      errorMap: () => ({ message: '请先同意用户协议' }),
    }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  });

export const resetPasswordSchema = z
  .object({
    phone: phoneSchema,
    code: smsCodeSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    client: clientSchema,
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  });

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10),
});

export type SendSmsCodeInput = z.infer<typeof sendSmsCodeSchema>;
export type SmsLoginInput = z.infer<typeof smsLoginSchema>;
export type PasswordLoginInput = z.infer<typeof passwordLoginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
