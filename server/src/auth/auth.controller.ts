import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  passwordLoginSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
  sendSmsCodeSchema,
  smsLoginSchema,
  type PasswordLoginInput,
  type RegisterInput,
  type ResetPasswordInput,
  type SendSmsCodeInput,
  type SmsLoginInput,
} from '@quizpeak/shared';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService, type AuthResult } from './auth.service';
import { SmsService } from './sms.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sms: SmsService,
  ) {}

  @Public()
  @Post('sms-code')
  @HttpCode(200)
  sendSmsCode(@Body(new ZodValidationPipe(sendSmsCodeSchema)) body: SendSmsCodeInput) {
    return this.sms.send(body.phone, body.scene, body.client);
  }

  @Public()
  @Post('login/sms')
  @HttpCode(200)
  smsLogin(
    @Body(new ZodValidationPipe(smsLoginSchema)) body: SmsLoginInput,
  ): Promise<AuthResult> {
    return this.auth.smsLogin(body);
  }

  @Public()
  @Post('login/password')
  @HttpCode(200)
  passwordLogin(
    @Body(new ZodValidationPipe(passwordLoginSchema)) body: PasswordLoginInput,
  ): Promise<AuthResult> {
    return this.auth.passwordLogin(body);
  }

  @Public()
  @Post('register')
  register(@Body(new ZodValidationPipe(registerSchema)) body: RegisterInput): Promise<AuthResult> {
    return this.auth.register(body);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordInput,
  ): Promise<{ success: true }> {
    return this.auth.resetPassword(body);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body(new ZodValidationPipe(refreshTokenSchema)) body: { refreshToken: string }) {
    return this.auth.refresh(body.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(200)
  logout() {
    return this.auth.logout();
  }
}
