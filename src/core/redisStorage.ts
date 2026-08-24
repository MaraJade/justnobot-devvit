/**
 * Redis storage utilities for JustNoBot
 * Replaces PostgreSQL database from app-to-migrate/justnobot.py
 */

import { redis } from '@devvit/web/server';

// Redis key patterns
const COMMENTED_POSTS_KEY = (postId: string) => `commented_posts:${postId}`;
const SUBSCRIBERS_KEY = (poster: string, subreddit: string) => `subscribers:${poster}:${subreddit}`;
const USER_POST_COUNT_KEY = (user: string, subreddit: string) => `user_post_count:${user}:${subreddit}`;

/**
 * Check if a post has already been commented on by the bot
 */
export async function hasCommentedOnPost(postId: string): Promise<boolean> {
  const result = await redis.get(COMMENTED_POSTS_KEY(postId));
  return result !== null && result !== undefined;
}

/**
 * Mark a post as commented on by the bot
 */
export async function markPostAsCommented(postId: string): Promise<void> {
  await redis.set(COMMENTED_POSTS_KEY(postId), 'true');
}

/**
 * Get user's post count in a subreddit
 */
export async function getUserPostCount(user: string, subreddit: string): Promise<number> {
  const result = await redis.get(USER_POST_COUNT_KEY(user, subreddit));
  return result ? parseInt(result, 10) : 0;
}

/**
 * Increment user's post count in a subreddit
 */
export async function incrementUserPostCount(user: string, subreddit: string): Promise<number> {
  return await redis.incrBy(USER_POST_COUNT_KEY(user, subreddit), 1);
}

/**
 * Get all subscribers for a poster in a subreddit
 */
export async function getSubscribers(poster: string, subreddit: string): Promise<string[]> {
  const result = await redis.get(SUBSCRIBERS_KEY(poster, subreddit));
  if (!result) return [];
  
  try {
    return JSON.parse(result);
  } catch {
    return [];
  }
}

/**
 * Add a subscriber for a poster in a subreddit
 */
export async function addSubscriber(subscriber: string, poster: string, subreddit: string): Promise<void> {
  const subscribers = await getSubscribers(poster, subreddit);
  if (!subscribers.includes(subscriber)) {
    subscribers.push(subscriber);
    await redis.set(SUBSCRIBERS_KEY(poster, subreddit), JSON.stringify(subscribers));
  }
}

/**
 * Remove a subscriber for a poster in a subreddit
 */
export async function removeSubscriber(subscriber: string, poster: string, subreddit: string): Promise<void> {
  const subscribers = await getSubscribers(poster, subreddit);
  const filtered = subscribers.filter(sub => sub !== subscriber);
  await redis.set(SUBSCRIBERS_KEY(poster, subreddit), JSON.stringify(filtered));
}
