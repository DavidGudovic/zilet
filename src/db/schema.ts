import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  bigint,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import type { Body } from '@/lib/content';
const time = (name: string) => timestamp(name, { withTimezone: true });
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: time('created_at').notNull().defaultNow(),
  updatedAt: time('updated_at').notNull().defaultNow(),
  role: text('role').notNull().default('reader'),
  suspended: boolean('suspended').notNull().default(false),
});
export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: time('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: time('created_at').notNull(),
  updatedAt: time('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});
export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    issuer: text('issuer').notNull(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: time('access_token_expires_at'),
    refreshTokenExpiresAt: time('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: time('created_at').notNull(),
    updatedAt: time('updated_at').notNull(),
  },
  (t) => [uniqueIndex('account_issuer_account_idx').on(t.issuer, t.accountId)],
);
export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: time('expires_at').notNull(),
  createdAt: time('created_at').notNull().defaultNow(),
  updatedAt: time('updated_at').notNull().defaultNow(),
});
export const rateLimit = pgTable('rate_limit', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  count: integer('count').notNull(),
  lastRequest: bigint('last_request', { mode: 'number' }).notNull(),
});
export const authors = pgTable('authors', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  bio: text('bio'),
  portraitId: text('portrait_id'),
  isEditor: boolean('is_editor').notNull().default(false),
});
export type ImageRef = {
  id: string;
  alt: string;
  caption: string;
  credit: string;
  placement: 'above' | 'beside' | 'below';
  focalX: number;
  focalY: number;
};
export type RevisionContent = {
  title: string;
  intro: string;
  editorialNote?: string;
  authorId: string;
  type: 'poem' | 'prose' | 'gallery';
  body: Body;
  rubrics: string[];
  media: ImageRef[];
  commentsOpen: boolean;
};
export const posts = pgTable('posts', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  status: text('status').notNull().default('draft'),
  draftRevisionId: text('draft_revision_id'),
  publishedRevisionId: text('published_revision_id'),
  version: integer('version').notNull().default(0),
  createdBy: text('created_by')
    .notNull()
    .references(() => user.id),
  createdAt: time('created_at').notNull().defaultNow(),
  updatedAt: time('updated_at').notNull().defaultNow(),
  publishedAt: time('published_at'),
  searchText: text('search_text').notNull().default(''),
});
export const revisions = pgTable(
  'revisions',
  {
    id: text('id').primaryKey(),
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    content: jsonb('content').$type<RevisionContent>().notNull(),
    editorialNoteBy: text('editorial_note_by').references(() => user.id),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id),
    createdAt: time('created_at').notNull().defaultNow(),
  },
  (t) => [index('revision_post_idx').on(t.postId)],
);
export const media = pgTable('media', {
  id: text('id').primaryKey(),
  filename: text('filename').notNull(),
  originalPath: text('original_path').notNull(),
  path: text('path').notNull(),
  smallPath: text('small_path').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  alt: text('alt').notNull().default(''),
  caption: text('caption').notNull().default(''),
  credit: text('credit').notNull().default(''),
  createdBy: text('created_by')
    .notNull()
    .references(() => user.id),
  createdAt: time('created_at').notNull().defaultNow(),
});
export const placements = pgTable('placements', {
  slot: text('slot').primaryKey(),
  postId: text('post_id').references(() => posts.id, { onDelete: 'set null' }),
});
export const comments = pgTable(
  'comments',
  {
    id: text('id').primaryKey(),
    postId: text('post_id')
      .notNull()
      .references(() => posts.id),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    body: text('body').notNull(),
    status: text('status').notNull().default('visible'),
    createdAt: time('created_at').notNull().defaultNow(),
    removedBy: text('removed_by').references(() => user.id),
  },
  (t) => [index('comment_post_idx').on(t.postId, t.createdAt)],
);
export const moderation = pgTable('moderation', {
  id: text('id').primaryKey(),
  commentId: text('comment_id').references(() => comments.id),
  targetUserId: text('target_user_id').references(() => user.id),
  actorId: text('actor_id')
    .notNull()
    .references(() => user.id),
  action: text('action').notNull(),
  createdAt: time('created_at').notNull().defaultNow(),
});
export const limits = pgTable('limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  resetAt: time('reset_at').notNull(),
});
export const redirects = pgTable('redirects', {
  slug: text('slug').primaryKey(),
  postId: text('post_id')
    .notNull()
    .references(() => posts.id),
});
