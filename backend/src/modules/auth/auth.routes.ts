import { Router } from "express";
import { container } from "../../core/container/container";
import { AuthController } from "./auth.controller";
import { validate } from "../../core/middlewares/validate.middleware";
import { createRateLimiter } from "../../core/middlewares/rateLimiter.middleware";
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ResendVerificationDto,
} from "./auth.dto";

const router = Router();
const authController = container.resolve<AuthController>("authController");

const registerLimit = createRateLimiter("auth-register", 10, 15 * 60_000, "ip");
const loginLimit = createRateLimiter("auth-login", 20, 15 * 60_000, "ip");
const forgotLimit = createRateLimiter("auth-forgot", 5, 15 * 60_000, "ip");
const resendLimit = createRateLimiter("auth-resend", 5, 15 * 60_000, "ip");
const verifyLimit = createRateLimiter("auth-verify", 20, 15 * 60_000, "ip");

router.post(
  "/register/candidate",
  registerLimit,
  validate(RegisterDto),
  authController.registerCandidate,
);

router.post(
  "/register/company",
  registerLimit,
  validate(RegisterDto),
  authController.registerCompany,
);

router.post("/login", loginLimit, validate(LoginDto), authController.login);

router.get("/verify-email", verifyLimit, authController.verifyEmail);

router.post("/refresh", authController.refresh);

router.post("/logout", authController.logout);

router.post(
  "/forgot-password",
  forgotLimit,
  validate(ForgotPasswordDto),
  authController.forgotPassword,
);

router.post(
  "/reset-password",
  validate(ResetPasswordDto),
  authController.resetPassword,
);

router.post(
  "/resend-verification",
  resendLimit,
  validate(ResendVerificationDto),
  authController.resendVerification,
);

export default router;
