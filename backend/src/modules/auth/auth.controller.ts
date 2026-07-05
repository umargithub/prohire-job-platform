import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { UnauthorizedError } from "../../core/errors/AppError";
import { config } from "../../config";
import {
  RegisterInput,
  LoginInput,
  ResetPasswordInput,
  ResendVerificationInput,
} from "./auth.dto";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.NODE_ENV === "production",
  sameSite: (config.NODE_ENV === "production" ? "strict" : "lax") as "strict" | "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/api/v1/auth",
};

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  registerCandidate = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const input = req.body as RegisterInput;
      const result = await this.authService.registerCandidate(input);
      res.status(201).json({ success: true, data: result });
    },
  );

  registerCompany = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const input = req.body as RegisterInput;
      const result = await this.authService.registerCompany(input);
      res.status(201).json({ success: true, data: result });
    },
  );

  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const input = req.body as LoginInput;
    const result = await this.authService.login(input);

    res.cookie("refreshToken", result.refreshToken, COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    });
  });

  verifyEmail = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const rawToken = req.body.token as string;
      const result = await this.authService.verifyEmail(rawToken);
      res.status(200).json({ success: true, data: result });
    },
  );

  refresh = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const rawToken = req.cookies["refreshToken"] as string | undefined;

    if (!rawToken) {
      throw new UnauthorizedError("Missing refresh token");
    }

    const result = await this.authService.refresh(rawToken);

    res.cookie("refreshToken", result.newRefreshToken, COOKIE_OPTIONS);
    res
      .status(200)
      .json({
        success: true,
        data: { accessToken: result.accessToken, user: result.user },
      });
  });

  logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const rawToken = req.cookies["refreshToken"] as string | undefined;

    if (rawToken) {
      await this.authService.logout(rawToken);
    }

    res.clearCookie("refreshToken", {
      ...COOKIE_OPTIONS,
      maxAge: 0,
    });

    res.status(204).send();
  });

  forgotPassword = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { email } = req.body as { email: string };
      const result = await this.authService.forgotPassword(email);
      res.status(200).json({ success: true, data: result });
    },
  );

  resetPassword = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const input = req.body as ResetPasswordInput;
      const result = await this.authService.resetPassword(
        input.token,
        input.password,
      );
      res.status(200).json({ success: true, data: result });
    },
  );

  resendVerification = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const input = req.body as ResendVerificationInput;
      const result = await this.authService.resendVerificationEmail(input);
      res.status(200).json({ success: true, data: result });
    },
  );

  me = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = await this.authService.getMe(req.user!.userId);
    res.status(200).json({ success: true, data: user });
  });
}
