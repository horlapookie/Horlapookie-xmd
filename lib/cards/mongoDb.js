
import mongoose from 'mongoose';

const cardDeckSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  cards: { type: Array, default: [] },
  updatedAt: { type: Date, default: Date.now }
});

const cardCollectionSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  cards: { type: Array, default: [] },
  updatedAt: { type: Date, default: Date.now }
});

const spawnedCardSchema = new mongoose.Schema({
  chatId: { type: String, required: true, unique: true },
  cardData: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now }
});

const cardSaleSchema = new mongoose.Schema({
  chatId: { type: String, required: true, unique: true },
  saleData: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now }
});

const cardCatalogSchema = new mongoose.Schema({
  tier: { type: String, required: true, index: true },
  name: { type: String, required: true },
  url: { type: String, required: true },
  source: { type: String, default: 'Anime Collection' },
  id: { type: String, unique: true, required: true },
  createdAt: { type: Date, default: Date.now }
});

const CardDeck = mongoose.model('CardDeck', cardDeckSchema);
const CardCollection = mongoose.model('CardCollection', cardCollectionSchema);
const SpawnedCard = mongoose.model('SpawnedCard', spawnedCardSchema);
const CardSale = mongoose.model('CardSale', cardSaleSchema);
const CardCatalog = mongoose.model('CardCatalog', cardCatalogSchema);

export async function getUserDeck(userId) {
  const deck = await CardDeck.findOne({ userId });
  return deck ? deck.cards : [];
}

export async function getUserCollection(userId) {
  const collection = await CardCollection.findOne({ userId });
  return collection ? collection.cards : [];
}

export async function setUserDeck(userId, cards) {
  await CardDeck.findOneAndUpdate(
    { userId },
    { cards, updatedAt: Date.now() },
    { upsert: true, new: true }
  );
  return cards;
}

export async function setUserCollection(userId, cards) {
  await CardCollection.findOneAndUpdate(
    { userId },
    { cards, updatedAt: Date.now() },
    { upsert: true, new: true }
  );
  return cards;
}

export async function addToDeck(userId, card) {
  const deck = await getUserDeck(userId);
  if (deck.length >= 12) {
    return false;
  }
  deck.push(card);
  await setUserDeck(userId, deck);
  return true;
}

export async function addToCollection(userId, card) {
  const collection = await getUserCollection(userId);
  collection.push(card);
  await setUserCollection(userId, collection);
  return collection;
}

export async function getSpawnedCard(chatId) {
  const spawned = await SpawnedCard.findOne({ chatId: chatId.toString() });
  return spawned ? spawned.cardData : null;
}

export async function setSpawnedCard(chatId, cardData) {
  await SpawnedCard.findOneAndUpdate(
    { chatId: chatId.toString() },
    { cardData, createdAt: Date.now() },
    { upsert: true, new: true }
  );
  return cardData;
}

export async function deleteSpawnedCard(chatId) {
  await SpawnedCard.deleteOne({ chatId: chatId.toString() });
  return true;
}

export async function getSaleData(chatId) {
  const sale = await CardSale.findOne({ chatId: chatId.toString() });
  return sale ? sale.saleData : null;
}

export async function setSaleData(chatId, saleData) {
  await CardSale.findOneAndUpdate(
    { chatId: chatId.toString() },
    { saleData, createdAt: Date.now() },
    { upsert: true, new: true }
  );
  return saleData;
}

export async function deleteSaleData(chatId) {
  await CardSale.deleteOne({ chatId: chatId.toString() });
  return true;
}

export async function cleanupOldSpawns() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = await SpawnedCard.deleteMany({ createdAt: { $lt: oneDayAgo } });
  return result.deletedCount;
}

export async function cleanupOldSales() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = await CardSale.deleteMany({ createdAt: { $lt: oneDayAgo } });
  return result.deletedCount;
}

export async function addCardToCatalog(card) {
  const cardId = card.id || `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await CardCatalog.findOneAndUpdate(
    { id: cardId },
    {
      tier: card.tier,
      name: card.name || card.title,
      url: card.url,
      source: card.source || 'Anime Collection',
      id: cardId
    },
    { upsert: true, new: true }
  );
  return cardId;
}

export async function getRandomCardFromCatalog() {
  const count = await CardCatalog.countDocuments();
  if (count === 0) return null;
  
  const random = Math.floor(Math.random() * count);
  const card = await CardCatalog.findOne().skip(random);
  
  if (!card) return null;
  
  return {
    name: card.name,
    tier: card.tier,
    source: card.source,
    id: card.id,
    image: card.url
  };
}

export async function getCardCatalogCount() {
  return await CardCatalog.countDocuments();
}

export async function getAllCardsFromCatalog(filter = {}) {
  return await CardCatalog.find(filter);
}

export async function clearCardCatalog() {
  return await CardCatalog.deleteMany({});
}
