import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.join(__dirname, '../data/cards');
const dbPath = path.join(dbDir, 'card.sqlite');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS user_decks (
    user_id TEXT PRIMARY KEY,
    cards TEXT NOT NULL,
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS user_collections (
    user_id TEXT PRIMARY KEY,
    cards TEXT NOT NULL,
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS spawned_cards (
    chat_id TEXT PRIMARY KEY,
    card_data TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS card_sales (
    chat_id TEXT PRIMARY KEY,
    sale_data TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );
`);

export function getUserDeck(userId) {
  const stmt = db.prepare('SELECT cards FROM user_decks WHERE user_id = ?');
  const row = stmt.get(userId);
  return row ? JSON.parse(row.cards) : [];
}

export function getUserCollection(userId) {
  const stmt = db.prepare('SELECT cards FROM user_collections WHERE user_id = ?');
  const row = stmt.get(userId);
  return row ? JSON.parse(row.cards) : [];
}

export function setUserDeck(userId, deck) {
  const stmt = db.prepare(`
    INSERT INTO user_decks (user_id, cards, updated_at) 
    VALUES (?, ?, strftime('%s', 'now'))
    ON CONFLICT(user_id) DO UPDATE SET 
      cards = excluded.cards,
      updated_at = excluded.updated_at
  `);
  stmt.run(userId, JSON.stringify(deck));
  return deck;
}

export function setUserCollection(userId, collection) {
  const stmt = db.prepare(`
    INSERT INTO user_collections (user_id, cards, updated_at) 
    VALUES (?, ?, strftime('%s', 'now'))
    ON CONFLICT(user_id) DO UPDATE SET 
      cards = excluded.cards,
      updated_at = excluded.updated_at
  `);
  stmt.run(userId, JSON.stringify(collection));
  return collection;
}

export function addToDeck(userId, card) {
  const deck = getUserDeck(userId);
  if (deck.length >= 12) {
    return false;
  }
  deck.push(card);
  setUserDeck(userId, deck);
  return true;
}

export function addToCollection(userId, card) {
  const collection = getUserCollection(userId);
  collection.push(card);
  setUserCollection(userId, collection);
  return collection;
}

export function getSpawnedCard(chatId) {
  const stmt = db.prepare('SELECT card_data FROM spawned_cards WHERE chat_id = ?');
  const row = stmt.get(chatId.toString());
  return row ? JSON.parse(row.card_data) : null;
}

export function setSpawnedCard(chatId, cardData) {
  const stmt = db.prepare(`
    INSERT INTO spawned_cards (chat_id, card_data, created_at) 
    VALUES (?, ?, strftime('%s', 'now'))
    ON CONFLICT(chat_id) DO UPDATE SET 
      card_data = excluded.card_data,
      created_at = excluded.created_at
  `);
  stmt.run(chatId.toString(), JSON.stringify(cardData));
  return cardData;
}

export function deleteSpawnedCard(chatId) {
  const stmt = db.prepare('DELETE FROM spawned_cards WHERE chat_id = ?');
  stmt.run(chatId.toString());
  return true;
}

export function getSaleData(chatId) {
  const stmt = db.prepare('SELECT sale_data FROM card_sales WHERE chat_id = ?');
  const row = stmt.get(chatId.toString());
  return row ? JSON.parse(row.sale_data) : null;
}

export function setSaleData(chatId, saleData) {
  const stmt = db.prepare(`
    INSERT INTO card_sales (chat_id, sale_data, created_at) 
    VALUES (?, ?, strftime('%s', 'now'))
    ON CONFLICT(chat_id) DO UPDATE SET 
      sale_data = excluded.sale_data,
      created_at = excluded.created_at
  `);
  stmt.run(chatId.toString(), JSON.stringify(saleData));
  return saleData;
}

export function deleteSaleData(chatId) {
  const stmt = db.prepare('DELETE FROM card_sales WHERE chat_id = ?');
  stmt.run(chatId.toString());
  return true;
}

export function cleanupOldSpawns() {
  const stmt = db.prepare('DELETE FROM spawned_cards WHERE created_at < strftime("%s", "now", "-24 hours")');
  const result = stmt.run();
  return result.changes;
}

export function cleanupOldSales() {
  const stmt = db.prepare('DELETE FROM card_sales WHERE created_at < strftime("%s", "now", "-24 hours")');
  const result = stmt.run();
  return result.changes;
}

export default db;
