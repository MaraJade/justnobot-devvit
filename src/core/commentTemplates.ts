/**
 * Comment templates for JustNoBot
 * Based on app-to-migrate/comments.py
 */

export interface CommentContext {
  subreddit: string;
  author: string;
  postTitle: string;
  postPermalink: string;
  isFirstTimePoster: boolean;
  userHistory: string;
}

export function generateQuickRules(subreddit: string): string {
  return `**Quick Rule Reminders:**

OP's needs come first, avoid dramamongering, respect the flair, and don't be an asshole. If your only advice is to jump straight to NC or divorce, your comment may be subject to removal at moderator discretion.

[**^(Full Rules)**](https://www.reddit.com/r/${subreddit}/wiki/index#wiki_rules) ^(|) [^(Acronym Index)](https://www.reddit.com/r/${subreddit}/wiki/index#wiki_acronym_dictionary) ^(|) [^(Flair Guide)](https://www.reddit.com/r/${subreddit}/wiki/index#wiki_post_flairs) ^(|) [^(Report PM Trolls)](https://www.reddit.com/r/${subreddit}/wiki/index#wiki_trolls_suck)`;
}

export function generateResources(subreddit: string): string {
  return `**Resources:**
[^(In Crisis?)](https://www.reddit.com/r/JustNoNetwork/wiki/links#wiki_crisis_links.3A_because_there.2019s_more_than_one_type_of_crisis) ^(|) [^(Tips for Protecting Yourself)](https://www.reddit.com/r/JUSTNOMIL/wiki/index#wiki_protecting_yourself) ^(|) [^(Our Book List)](https://www.reddit.com/r/JustNoNetwork/wiki/books) ^(|) [^(This Sub's Wiki)](https://www.reddit.com/r/${subreddit}/wiki/) ^(|) [^(General Resources)](https://www.reddit.com/r/JustNoNetwork/wiki/tos)`;
}

export function generateWelcomeMessage(subreddit: string): string {
  return `Welcome to /r/${subreddit}!

I'm JustNoBot. I help people follow your posts!`;
}

export function generateHistoryMessage(author: string, userHistory: string): string {
  if (userHistory) {
    return `Other posts from /u/${author}:

${userHistory}`;
  }
  return '';
}

export function generateSubscriptionPrompt(author: string, subreddit: string): string {
  return `*****

^(To be notified as soon as ${author} posts an update ) ^([click here.](http://www.reddit.com/message/compose/?to=TheJustNoBot&subject=Subscribe&message=${author} ${subreddit}))

*****`;
}

export function generateBotFooter(subreddit: string): string {
  return `

*^(I am a bot, and this action was performed automatically. Please)* [*^(contact the moderators of this subreddit)*](/message/compose/?to=/r/${subreddit}) *^(if you have any questions or concerns.)*`;
}

export function generateFullComment(context: CommentContext, welcomeOverride?: string): string {
  const quickRules = generateQuickRules(context.subreddit);
  const resources = generateResources(context.subreddit);
  const welcome = welcomeOverride || (context.isFirstTimePoster 
    ? generateWelcomeMessage(context.subreddit)
    : generateHistoryMessage(context.author, context.userHistory));
  const subscriptionPrompt = generateSubscriptionPrompt(context.author, context.subreddit);
  const botFooter = generateBotFooter(context.subreddit);

  return `${quickRules}

${resources}

${welcome}

${subscriptionPrompt}

${botFooter}`;
}
