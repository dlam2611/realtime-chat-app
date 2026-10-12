import jwt from "jsonwebtoken";
import redis from "../config/redis.js";
import ApiError from "../utils/ApiError.js";

const REFRESH_TOKEN_EXPIRY = "7d";
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 ngày tính theo giây

const getRefreshTokenSecret = () => {
  return process.env.REFRESH_TOKEN_SECRET || process.env.REFRRESH_TOKEN_SECRET;
};

export const createAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "15m",
  });
};

export const createRefreshToken = (userId) => {
  try {
    const refreshToken = jwt.sign(
      { userId },
      getRefreshTokenSecret(),
      {
        expiresIn: REFRESH_TOKEN_EXPIRY,
      },
    );
    return refreshToken;
  } catch (err) {
    throw err;
  }
};

export const saveRefreshToken = async (userId, refreshToken) => {
  try {
    const uid = userId.toString();
    const multi = redis.multi();
    multi.set(`refreshToken:${refreshToken}`, uid, "EX", REFRESH_TOKEN_TTL_SECONDS);
    multi.sadd(`userTokens:${uid}`, refreshToken);
    multi.expire(`userTokens:${uid}`, REFRESH_TOKEN_TTL_SECONDS);
    await multi.exec();
  } catch (err) {
    throw err;
  }
};

export const deleteRefreshToken = async (refreshToken) => {
  try {
    if (!refreshToken) return;
    const userId = await redis.get(`refreshToken:${refreshToken}`);
    const multi = redis.multi();
    if (userId) {
      multi.srem(`userTokens:${userId}`, refreshToken);
    }
    multi.del(`refreshToken:${refreshToken}`);
    await multi.exec();
  } catch (err) {
    throw err;
  }
};

export const verifyRefreshToken = async (refreshToken) => {
  try {
    if (!refreshToken) {
      throw new ApiError(401, "Không tìm thấy refresh token");
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, getRefreshTokenSecret());
    } catch (err) {
      throw new ApiError(403, "Token không hợp lệ hoặc đã hết hạn");
    }

    const userId = await redis.get(`refreshToken:${refreshToken}`);
    if (!userId) {
      throw new ApiError(401, "Phiên làm việc không tồn tại hoặc đã đăng xuất");
    }

    return decoded.userId || userId;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(403, "Token không hợp lệ hoặc đã hết hạn");
  }
};

export const revokeAllUserTokens = async (userId) => {
  try {
    if (!userId) return;
    const uid = userId.toString();
    const tokens = await redis.smembers(`userTokens:${uid}`);
    if (tokens && tokens.length > 0) {
      const tokenKeys = tokens.map((token) => `refreshToken:${token}`);
      await redis.del(...tokenKeys);
    }
    await redis.del(`userTokens:${uid}`);
  } catch (err) {
    throw err;
  }
};
