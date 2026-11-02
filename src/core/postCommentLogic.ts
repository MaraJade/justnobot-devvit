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
 * Check if post has a sticky comment
 * Replaces app-to-migrate/justnobot.py stickyChecker function (lines 283-299)
 * Simplified: only checks for existing sticky comments, assumes bot comment is the distinguished one
 */
async function hasStickyComment(postId: string): Promise<{ hasSticky: boolean }> {
  try {
    const post = await reddit.getPostById(postId as `t3_${string}`);
    const comments = await post.comments.all();
    
    let hasSticky = false;
    
    for (const comment of comments) {
      if (comment.stickied) {
        hasSticky = true;
        break;
      }
    }
    
    return { hasSticky };
  } catch (error) {
    console.error('Error checking for sticky comments:', error);
    return { hasSticky: false };
  }
}

/**
 * Distinguish and lock bot comment
 * Replaces app-to-migrate/justnobot.py lines 375-391
 */
async function moderateBotComment(commentId: string, postId: string): Promise<void> {
  try {
    const comment = await reddit.getCommentById(commentId as `t1_${string}`);
    
    // Check for existing sticky comments
    const { hasSticky } = await hasStickyComment(postId);
    
    // Distinguish and sticky if no existing sticky
    if (!hasSticky) {
      try {
        await comment.distinguish(true); // sticky=True
        console.log('Distinguished and stickied bot comment:', commentId);
      } catch (error) {
        console.error('Error distinguishing/stickying comment:', error);
      }
    }
    // If there is an existing sticky, just distinguish without sticky
    else {
      try {
        await comment.distinguish(false); // sticky=False
        console.log('Distinguished (non-sticky) bot comment:', commentId);
      } catch (error) {
        console.error('Error distinguishing comment:', error);
      }
    }
    
    // Lock the comment so people stop accidentally replying to it
    // Replaces app-to-migrate/justnobot.py lockComment function (lines 301-306)
    try {
      await comment.lock();
      console.log('Locked bot comment:', commentId);
    } catch (error) {
      console.error('Error locking comment:', error);
    }
  } catch (error) {
    console.error('Error moderating bot comment:', error);
  }
}

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
  const comment = await reddit.submitComment({
    id: post.id as `t1_${string}` | `t3_${string}`,
    text: commentText
  });
  
  // Mark post as commented
  await markPostAsCommented(post.id);
  
  // Increment user's post count
  await incrementUserPostCount(author, subreddit);
  
  // Moderate the bot comment (distinguish and lock)
  // Replaces app-to-migrate/justnobot.py lines 375-391
  await moderateBotComment(comment.id, post.id);
  
  // Notify subscribers about new post
  // Replaces app-to-migrate/justnobot.py pingSubscribers call (line 398)
  await notifySubscribers(author, subreddit, post.title || '', post.permalink || '');
}
