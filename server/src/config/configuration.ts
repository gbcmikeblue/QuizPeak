export interface AppConfig {
  port: number;
  jwtSecret: string;
  accessExpires: number;
  refreshExpires: number;
  smsProvider: 'console' | 'aliyun';
}

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.PORT ?? 8080),
    jwtSecret: process.env.JWT_SECRET ?? 'dev-only-secret-change-me',
    accessExpires: Number(process.env.JWT_ACCESS_EXPIRES ?? 1800),
    refreshExpires: Number(process.env.JWT_REFRESH_EXPIRES ?? 604800),
    smsProvider: (process.env.SMS_PROVIDER as AppConfig['smsProvider']) ?? 'console',
  };
}
