import { asyncHandler } from "../utils/asyncHandle.js";
import {
  sendFriendRequestService,
  acceptFriendRequestService,
  deleteFriendRequestService,
  getAllFriendsService,
  getAllFriendRequestService,
  getFriendSuggestions,
} from "../services/friendService.js";

export const sendFriendRequest = asyncHandler(async (req, res) => {
  const { to, message } = req.body;
  const from = req.user._id;
  const result = await sendFriendRequestService(from, to, message);
  return res.status(200).json(result);
});

export const acceptFriendRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const userId = req.user._id;
  const result = await acceptFriendRequestService(userId, requestId);
  return res.status(200).json(result);
});

export const deleteFriendRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  await deleteFriendRequestService(requestId);
  return res.sendStatus(204);
});

export const getAllFriends = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const friends = await getAllFriendsService(userId);
  return res.status(200).json({ friends });
});

export const getAllFriendRequest = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const result = await getAllFriendRequestService(userId);
  return res.status(200).json(result);
});

export const getSuggestions = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 8;
  const result = await getFriendSuggestions(userId, page, limit);
  return res.status(200).json(result);
});
