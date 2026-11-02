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
 * Replaces app-to-migrate/justnobot.py addSubscriber function (lines 158-218)
 */
export async function addSubscriber(subscriber: string, poster: string, subreddit: string): Promise<boolean> {
  try {
    const subscribers = await getSubscribers(poster, subreddit);
    if (!subscribers.includes(subscriber)) {
      subscribers.push(subscriber);
      await redis.set(SUBSCRIBERS_KEY(poster, subreddit), JSON.stringify(subscribers));
      console.log(`[Subscription] Added ${subscriber} -> ${poster} in r/${subreddit}`);
      return true;
    }
    console.log(`[Subscription] ${subscriber} already subscribed to ${poster} in r/${subreddit}`);
    return true; // Already subscribed is considered success
  } catch (error) {
    console.error('[Subscription] Failed to add subscriber:', error);
    return false;
  }
}

/**
 * Remove a subscriber for a poster in a subreddit
 * Replaces app-to-migrate/justnobot.py removeSubscription function (lines 223-269)
 */
export async function removeSubscriber(subscriber: string, poster: string, subreddit: string): Promise<boolean> {
  try {
    const subscribers = await getSubscribers(poster, subreddit);
    const filtered = subscribers.filter(sub => sub !== subscriber);
    await redis.set(SUBSCRIBERS_KEY(poster, subreddit), JSON.stringify(filtered));
    console.log(`[Subscription] Removed ${subscriber} -> ${poster} in r/${subreddit}`);
    return true;
  } catch (error) {
    console.error('[Subscription] Failed to remove subscriber:', error);
    return false;
  }
}
