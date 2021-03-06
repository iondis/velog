// @flow

import type { Context } from 'koa';
import Joi from 'joi';
import {
  validateSchema,
  filterUnique,
  generateSlugId,
  escapeForUrl,
  isUUID,
  formatShortDescription,
  generalHash,
} from 'lib/common';
import {
  Category,
  Post,
  PostsCategories,
  PostsTags,
  Tag,
  User,
  UserProfile,
  Comment,
  FollowUser,
  FollowTag,
  Feed,
  PostLike,
  PostScore,
  PostRead,
} from 'database/models';

import { serializePost, type PostModel } from 'database/models/Post';
import Sequelize from 'sequelize';
import removeMd from 'remove-markdown';
import { TYPES } from 'database/models/PostScore';
import db from 'database/db';

const { Op } = Sequelize;

type CreateFeedsParams = {
  postId: string,
  userId: string,
  tags: { id: string, name: string }[],
  username: string,
};

function convertMapToObject(m: Map<string, *>): any {
  const obj = {};
  m.forEach((v, k) => {
    obj[k] = v;
  });
  return obj;
}
async function createFeeds({
  postId, userId, tags, username,
}: CreateFeedsParams): Promise<*> {
  // TODO:

  const usersMap = new Map();

  // 1. USER FOLLOW
  try {
    const followers = await FollowUser.findAll({
      attributes: ['fk_user_id'],
      where: { fk_follow_user_id: userId },
      raw: true,
    });

    followers.forEach(({ fk_user_id }) => {
      usersMap.set(fk_user_id, [{ type: 'USER', value: username }]);
    });
  } catch (e) {
    console.log(e);
  }
  // 2. TAG FOLLOW (FOR EACH)
  try {
    const results = await Promise.all(tags.map(({ id }) => {
      return FollowTag.findAll({
        attributes: ['fk_user_id'],
        where: { fk_tag_id: id },
        raw: true,
      });
    }));
    results.forEach((followers, i) => {
      const tagName = tags[i].name;
      followers.forEach(({ fk_user_id }) => {
        const exists = usersMap.get(fk_user_id);
        const reason = { type: 'TAG', value: tagName };
        if (exists) {
          exists.push(reason);
        } else {
          usersMap.set(fk_user_id, [reason]);
        }
      });
    });
  } catch (e) {
    console.log(e);
  }
  // console.log(convertMapToObject(usersMap));
  const userIds = [...usersMap.keys()];
  const feeds = userIds.map(u => ({
    fk_post_id: postId,
    fk_user_id: u,
    reason: usersMap.get(u),
  }));
  await Feed.bulkCreate(feeds);
  // 3. Create Feeds
  // 4. Short Polling
}

export const writePost = async (ctx: Context): Promise<*> => {
  type BodySchema = {
    title: string,
    body: string,
    shortDescription: string,
    thumbnail: string,
    isMarkdown: boolean,
    isTemp: boolean,
    meta: any,
    categories: Array<string>,
    tags: Array<string>,
    urlSlug: string,
  };

  const schema = Joi.object().keys({
    title: Joi.string()
      .required()
      .min(1)
      .max(120),
    body: Joi.string()
      .required()
      .min(1),
    shortDescription: Joi.string(),
    thumbnail: Joi.string()
      .uri()
      .allow(null),
    isMarkdown: Joi.boolean().required(),
    isTemp: Joi.boolean().required(),
    meta: Joi.object(),
    categories: Joi.array()
      .items(Joi.string())
      .required(),
    tags: Joi.array()
      .items(Joi.string())
      .required(),
    urlSlug: Joi.string().max(130),
  });

  if (!validateSchema(ctx, schema)) {
    return;
  }

  const {
    title,
    body,
    shortDescription,
    thumbnail,
    isMarkdown,
    isTemp,
    meta,
    categories,
    tags,
    urlSlug,
  }: BodySchema = (ctx.request.body: any);

  const generatedUrlSlug = `${title} ${generateSlugId()}`;
  const escapedUrlSlug = escapeForUrl(urlSlug || generatedUrlSlug);
  const replaceDashToSpace = text => text.replace(/-/g, ' ');
  // TODO: validate url slug

  const uniqueTags: Array<string> = filterUnique(tags).map(replaceDashToSpace);
  const uniqueCategories: Array<string> = filterUnique(categories);

  try {
    // check: all categories are valid
    const ownCategories = await Category.listAllCategories(ctx.user.id);
    for (let i = 0; i < uniqueCategories.length; i++) {
      const categoryId = uniqueCategories[i];
      if (ownCategories.findIndex(c => c.id === categoryId) === -1) {
        ctx.status = 400;
        ctx.body = {
          name: 'INVALID_CATEGORY',
          payload: categoryId,
        };
        return;
      }
    }

    const tagIds = await Promise.all(uniqueTags.map(tag => Tag.getId(tag)));
    // create Post data
    const post = await Post.build({
      title,
      body,
      short_description: shortDescription,
      thumbnail,
      is_markdown: isMarkdown,
      is_temp: isTemp,
      fk_user_id: ctx.user.id,
      url_slug: escapedUrlSlug,
      meta,
    }).save();

    const postId = post.id;
    await PostsTags.link(postId, tagIds);
    await PostsCategories.link(postId, uniqueCategories);

    // const categoriesInfo = await PostsCategories.findCategoriesByPostId(postId);

    const postData = await Post.readPostById(postId);
    const serialized = serializePost(postData);

    ctx.body = serialized;

    if (!isTemp) {
      const tagData = tagIds.map((tagId, index) => ({
        id: tagId,
        name: uniqueTags[index],
      }));
      createFeeds({
        postId,
        userId: ctx.user.id,
        username: ctx.user.username,
        tags: tagData,
      });
    }
  } catch (e) {
    ctx.throw(500, e);
  }
};

export const readPost = async (ctx: Context): Promise<*> => {
  const { username, urlSlug } = ctx.params;
  try {
    const post = await Post.readPost(username, urlSlug);
    if (!post) {
      ctx.status = 404;
      return;
    }
    const commentsCount = await Comment.getCommentsCount(post.id);

    let liked = false;
    if (ctx.user) {
      const exists = await PostLike.checkExists({
        userId: ctx.user.id,
        postId: post.id,
      });
      liked = !!exists;
    }

    ctx.body = serializePost({ ...post.toJSON(), comments_count: commentsCount, liked });
    const hash = generalHash(ctx.request.ip);
    const userId = ctx.user ? ctx.user.id : null;

    // THIS CODE IS NOT PERFECT!
    // TODO: FIX THE CODE BY MAKING A POST READ QUEUE
    // check post read existancy
    const postRead = await PostRead.findOne({
      where: {
        ip_hash: hash,
        fk_post_id: post.id,
        created_at: {
          // $FlowFixMe
          [Op.gt]: new Date(new Date() - 24 * 60 * 60 * 1000),
        },
      },
    });

    if (postRead) {
      return;
    }

    await PostRead.create({
      ip_hash: hash,
      fk_post_id: post.id,
      fk_user_id: userId,
    });

    const count = await PostRead.countByPostId(post.id);
    console.log('조횟수', count);
    if (count % 10 === 0) {
      await PostScore.create({
        type: TYPES.READ,
        fk_user_id: null,
        fk_post_id: post.id,
        score: 0.125,
      });
    }
  } catch (e) {
    ctx.throw(500, e);
  }
};

export const listPosts = async (ctx: Context): Promise<*> => {
  const { username } = ctx.params;
  const { category, tag, cursor } = ctx.query;

  const query = {
    username,
    categoryUrlSlug: category,
    tag,
    cursor,
  };

  if (cursor && !isUUID(cursor)) {
    ctx.body = {
      type: 'INVALID_CURSOR_ID',
    };
    ctx.status = 400;
    return;
  }

  try {
    const result = await Post.listPosts(query);
    if (!result.data) {
      ctx.body = [];
      return;
    }
    // Fake Delay
    // await new Promise((resolve) => { setTimeout(resolve, 2000); });
    ctx.body = result.data
      .map(serializePost)
      .map(post => ({ ...post, body: formatShortDescription(post.body) }));
    // const link = `<${ctx.path}?cursor=${result.data[result.data.length - 1].id}>; rel="next";`;
    // ctx.set('Link', link)
    ctx.set('Count', result.count.toString());
  } catch (e) {
    ctx.throw(500, e);
  }
};
