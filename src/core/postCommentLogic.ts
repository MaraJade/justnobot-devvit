/**
 * Post comment posting logic for JustNoBot
 * Replaces app-to-migrate/justnobot.py post comment functionality
 */

import { reddit } from '@devvit/web/server';
import { 
  markPostAsCommented,
  getUserPostCount,
  incrementUserPostCount
} from './redisStorage';
import { 
  generateFullComment, 
  type CommentContext 
} from './commentTemplates';
import { notifySubscribers } from './subscriberNotifications';

/**
 * Check if post should be skipped (archived, locked, already commented)
 */
export function shouldSkipPost(post: { isArchived?: boolean }, hasCommented: boolean, author?: { name?: string } | null): boolean {
  // Skip archived posts
  if (post.isArchived) {
    return true;
  }
  
  // Skip if already commented
  if (hasCommented) {
    return true;
  }
  
  // Skip if author is deleted
  if (!author || !author.name) {
    return true;
  }
  
  return false;
}

/**
 * Get user's post history in subreddit
 * Replaces app-to-migrate/justnobot.py getHistory function (lines 319-357)
 * NOTE: Devvit Reddit API (both user.getPosts() and reddit.getPostsByUser()) returns empty results
 * Using Redis-based counting as fallback due to platform API limitations
 */
export async function getUserHistoryContext(author: string, subreddit: string): Promise<{
  isFirstTimePoster: boolean;
  userHistory: string;
}> {
  // Use Redis-based counting due to Devvit Reddit API limitations
  const postCount = await getUserPostCount(author, subreddit);
  
  if (postCount <= 1) {
    return {
      isFirstTimePoster: true,
      userHistory: ''
    };
  }
  
  // For returning posters, provide a message with link to full history
  // Note: Count reflects posts processed by Devvit bot, not total historical posts
  return {
    isFirstTimePoster: false,
    userHistory: `User has posted ${postCount} times since bot installation. ^(To see their full post history,)[^(click here)](/u/${author}/submitted)\n\n`
  };
}

/**
 * Generate and post comment on a post
 */
export async function postBotComment(post: { id: string; title?: string; permalink?: string }, subreddit: string, authorName?: string): Promise<void> {
  const author = authorName || '[deleted]';
  
  // Get user history context
  const { isFirstTimePoster, userHistory } = await getUserHistoryContext(author, subreddit);
  
  // Generate comment context
  const context: CommentContext = {
    subreddit,
    author,
    postTitle: post.title || '',
    postPermalink: post.permalink || '',
    isFirstTimePoster,
    userHistory
  };
  
  // Generate welcome message for first-time posters
  const welcome = isFirstTimePoster
    ? `Welcome to /r/${subreddit}!

I'm JustNoBot. I help people follow your posts!`
    : `Other posts from /u/${author}:

${userHistory}`;
  
  // Generate comment text
  const commentText = generateFullComment(context, welcome);
  
  // Post the comment
  await reddit.submitComment({
    id: post.id as `t1_${string}` | `t3_${string}`,
    text: commentText
  });
  
  // Mark post as commented
  await markPostAsCommented(post.id);
  
  // Increment user's post count
  await incrementUserPostCount(author, subreddit);
  
  // Notify subscribers about new post
  // Replaces app-to-migrate/justnobot.py pingSubscribers call (line 398)
  await notifySubscribers(author, subreddit, post.title || '', post.permalink || '');
}
