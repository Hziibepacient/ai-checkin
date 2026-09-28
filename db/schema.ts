import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const events = sqliteTable('events', {
 id:text('id').primaryKey(), owner:text('owner').notNull().unique(),title:text('title').notNull(),location:text('location').notNull(),
 starts:integer('starts').notNull(),ends:integer('ends').notNull(),expires:integer('expires').notNull(),status:text('status').notNull().default('draft'),
 message:text('message').notNull(),mediaKey:text('media_key'),mediaType:text('media_type'),created:integer('created').notNull(),
});
export const people=sqliteTable('people',{
 id:text('id').primaryKey(),eventId:text('event_id').notNull().references(()=>events.id),code:text('code').notNull(),name:text('name').notNull(),department:text('department').notNull().default(''),
 version:integer('version').notNull().default(1),tokenHash:text('token_hash').notNull().unique(),welcomeHash:text('welcome_hash').notNull().unique(),active:integer('active').notNull().default(1),revoked:integer('revoked').notNull().default(0),created:integer('created').notNull(),
},t=>[uniqueIndex('idx_people_event_code').on(t.eventId,t.code)]);
export const checkins=sqliteTable('checkins',{personId:text('person_id').primaryKey().references(()=>people.id),checkedAt:integer('checked_at').notNull()});
export const audits=sqliteTable('audits',{id:text('id').primaryKey(),eventId:text('event_id').notNull().references(()=>events.id),action:text('action').notNull(),detail:text('detail').notNull(),created:integer('created').notNull()});
export const rateLimits=sqliteTable('rate_limits',{personId:text('person_id').primaryKey().references(()=>people.id),window:integer('window').notNull(),count:integer('count').notNull()});
