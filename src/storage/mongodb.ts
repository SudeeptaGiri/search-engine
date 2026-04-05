// src/storage/mongodb.ts
import mongoose, { Schema, Document, Model } from 'mongoose';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// Document interface
export interface IWebPage extends Document {
  url: string;
  domain: string;
  title: string;
  rawHtml: string;
  textContent: string;
  tokens: string[];
  wordCount: number;
  contentHash: string;
  links: string[];
  crawledAt: Date;
  depth: number;
  statusCode: number;
}

const WebPageSchema = new Schema<IWebPage>({
  url:          { type: String, required: true, unique: true, index: true },
  domain:       { type: String, required: true, index: true },
  title:        { type: String, default: '' },
  rawHtml:      { type: String, default: '' },
  textContent:  { type: String, default: '' },
  tokens:       { type: [String], default: [] },
  wordCount:    { type: Number, default: 0 },
  contentHash:  { type: String, index: true },
  links:        { type: [String], default: [] },
  crawledAt:    { type: Date, default: Date.now },
  depth:        { type: Number, default: 0 },
  statusCode:   { type: Number, default: 200 },
});

// Text index for fallback full-text search
WebPageSchema.index({ title: 'text', textContent: 'text' });

export const WebPage: Model<IWebPage> = mongoose.model('WebPage', WebPageSchema);

export async function connectMongo(): Promise<void> {
  await mongoose.connect(config.mongodb.uri);
  logger.info('MongoDB connected');
}

export async function saveWebPage(data: Partial<IWebPage>): Promise<IWebPage> {
  return WebPage.findOneAndUpdate(
    { url: data.url },
    { $set: data },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export async function getWebPage(url: string): Promise<IWebPage | null> {
  return WebPage.findOne({ url });
}

export async function getWebPageById(id: string): Promise<IWebPage | null> {
  return WebPage.findById(id);
}

export async function getTotalDocuments(): Promise<number> {
  return WebPage.countDocuments();
}

export async function getAverageDocLength(): Promise<number> {
  const result = await WebPage.aggregate([
    { $group: { _id: null, avgLength: { $avg: '$wordCount' } } },
  ]);
  return result[0]?.avgLength || 0;
}