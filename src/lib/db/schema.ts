import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  address: text("address"),
  phone: text("phone"),
});

export const quotes = sqliteTable("quotes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  quoteNumber: text("quote_number"),
  clientId: integer("client_id").references(() => clients.id),
  date: text("date"),
  deliveryDate: text("delivery_date"),
  validUntil: text("valid_until"),
  total: real("total"),
  status: text("status").default("rascunho"),
  paymentConditions: text("payment_conditions"),
  discount: real("discount"),
  notes: text("notes"),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

export const quoteItems = sqliteTable("quote_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  quoteId: integer("quote_id")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  imageUrl: text("image_url"),
  width: real("width"),
  height: real("height"),
  glass: text("glass"),
  aluminumColor: text("aluminum_color"),
  hardwareColor: text("hardware_color"),
  quantity: integer("quantity"),
  unitPrice: real("unit_price"),
  totalPrice: real("total_price"),
});

export const quoteItemDimensions = sqliteTable("quote_item_dimensions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  quoteItemId: integer("quote_item_id")
    .notNull()
    .references(() => quoteItems.id, { onDelete: "cascade" }),
  label: text("label"),
  width: real("width"),
  height: real("height"),
  quantity: integer("quantity").default(1),
  unitPrice: real("unit_price"),
  totalPrice: real("total_price"),
});

export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  content: text("content").notNull(),
  createdAt: text("created_at"),
});

export const loginAttempts = sqliteTable("login_attempts", {
  ipHash: text("ip_hash").primaryKey(),
  count: integer("count").notNull().default(0),
  blockedUntil: integer("blocked_until"),
  updatedAt: integer("updated_at").notNull(),
});

// Drizzle relations (required for db.query API with `with`)
export const clientsRelations = relations(clients, ({ many }) => ({
  quotes: many(quotes),
}));

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  client: one(clients, {
    fields: [quotes.clientId],
    references: [clients.id],
  }),
  items: many(quoteItems),
}));

export const quoteItemsRelations = relations(quoteItems, ({ one, many }) => ({
  quote: one(quotes, {
    fields: [quoteItems.quoteId],
    references: [quotes.id],
  }),
  dimensions: many(quoteItemDimensions),
}));

export const quoteItemDimensionsRelations = relations(quoteItemDimensions, ({ one }) => ({
  quoteItem: one(quoteItems, {
    fields: [quoteItemDimensions.quoteItemId],
    references: [quoteItems.id],
  }),
}));
