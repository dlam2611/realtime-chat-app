import bcrypt from "bcrypt";
import { User } from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import {
  createAndSendVerificationOtp,
  createAndSendResetPasswordOtp,
  verifyOtpCode,
  generateOtp,
  getOtpExpiry,
} from "./otpService.js";
import { sendPasswordChangedEmail } from "./emailService.js";
import {
  createAccessToken,
  createRefreshToken,
  saveRefreshToken,
  deleteRefreshToken,
  verifyRefreshToken,
  revokeAllUserTokens,
} from "./jwtService.js";

export { createAccessToken };

export const checkEmail = async (email) => {
  const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
  if (existingEmail) {
    throw new ApiError(409, "Email đã được sử dụng");
  }
};

export const checkUsername = async (username) => {
  const existingUsername = await User.findOne({ username: username.toLowerCase().trim() });
  if (existingUsername) {
    throw new ApiError(409, "Username đã được sử dụng");
  }
};

export const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

export const checkPassword = async (plainPassword, hashedPassword) => {
  const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
  if (!isMatch) {
    throw new ApiError(401, "Mật khẩu không chính xác");
  }
  return true;
};

export const registerService = async ({ username, email, password, firstname, lastname }) => {
  await checkEmail(email);
  await checkUsername(username);

  const hashedPassword = await hashPassword(password);
  const otp = generateOtp();
  const otpExpires = getOtpExpiry(15);

  const user = new User({
    username: username.toLowerCase().trim(),
    email: email.toLowerCase().trim(),
    hashedPassword,
    displayName: `${firstname} ${lastname}`.trim(),
    isVerified: false,
    verificationOtp: otp,
    verificationOtpExpires: otpExpires,
  });

  await user.save();
  await createAndSendVerificationOtp(user);

  return {
    message: "Đăng ký thành công. Vui lòng kiểm tra email để nhập mã xác thực OTP.",
    email: user.email,
  };
};

export const verifyEmailService = async ({ email, otp }) => {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    throw new ApiError(404, "Không tìm thấy tài khoản với email này");
  }

  if (user.isVerified) {
    return {
      message: "Tài khoản của bạn đã được xác thực trước đó. Có thể đăng nhập ngay.",
    };
  }

  verifyOtpCode(user.verificationOtp, user.verificationOtpExpires, otp);

  user.isVerified = true;
  user.verificationOtp = undefined;
  user.verificationOtpExpires = undefined;
  await user.save();

  return {
    message: "Xác thực email thành công! Bây giờ bạn có thể đăng nhập vào AloHub.",
  };
};

export const resendVerificationOtpService = async (email) => {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    throw new ApiError(404, "Không tìm thấy tài khoản với email này");
  }

  if (user.isVerified) {
    throw new ApiError(400, "Tài khoản này đã được xác thực");
  }

  await createAndSendVerificationOtp(user);

  return {
    message: "Đã gửi lại mã OTP xác thực tới email của bạn.",
  };
};

export const loginService = async ({ username, password }) => {
  const user = await User.findOne({ username: username.toLowerCase().trim() });
  if (!user) {
    throw new ApiError(404, "Username không tồn tại");
  }

  await checkPassword(password, user.hashedPassword);

  if (!user.isVerified) {
    throw new ApiError(403, "Tài khoản của bạn chưa được xác thực email. Vui lòng nhập mã OTP xác thực.");
  }

  const accessToken = createAccessToken(user._id);
  const refreshToken = createRefreshToken(user._id);
  await saveRefreshToken(user._id, refreshToken);

  return {
    message: "Đăng nhập thành công",
    accessToken,
    refreshToken,
  };
};

export const forgotPasswordService = async (email) => {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    throw new ApiError(404, "Không tìm thấy tài khoản liên kết với địa chỉ email này");
  }

  await createAndSendResetPasswordOtp(user);

  return {
    message: "Mã OTP đặt lại mật khẩu đã được gửi đến email của bạn.",
    email: user.email,
  };
};

export const resetPasswordService = async ({ email, otp, newPassword }) => {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    throw new ApiError(404, "Không tìm thấy tài khoản");
  }

  verifyOtpCode(user.resetPasswordOtp, user.resetPasswordOtpExpires, otp);

  user.hashedPassword = await hashPassword(newPassword);
  user.resetPasswordOtp = undefined;
  user.resetPasswordOtpExpires = undefined;
  await user.save();

  await revokeAllUserTokens(user._id);

  await sendPasswordChangedEmail(user.email, user.displayName);

  return {
    message: "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.",
  };
};

export const logoutService = async (refreshToken) => {
  if (refreshToken) {
    await deleteRefreshToken(refreshToken);
  }
};

export const refreshAccessTokenService = async (refreshToken) => {
  if (!refreshToken) {
    throw new ApiError(401, "Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn");
  }
  const userId = await verifyRefreshToken(refreshToken);
  const accessToken = createAccessToken(userId);
  return { accessToken };
};
