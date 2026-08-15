import {
  check,
  customType,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";
import { centsToMoney, moneyToCents } from "./money";

const money = customType<{ data: number; driverData: number }>({
  dataType() {
    return "integer";
  },
  toDriver(value) {
    return moneyToCents(value);
  },
  fromDriver(value) {
    return centsToMoney(value);
  },
});

export const appMigrations = sqliteTable("app_migrations", {
  id: text("id").primaryKey(),
  appliedAt: text("applied_at").notNull(),
});

export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  address: text("address"),
  phone: text("phone"),
});

export const quotes = sqliteTable(
  "quotes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    quoteNumber: text("quote_number").notNull().unique(),
    clientId: integer("client_id").references(() => clients.id),
    date: text("date").notNull(),
    deliveryDate: text("delivery_date"),
    validUntil: text("valid_until"),
    total: money("total").notNull().default(0),
    status: text("status").notNull().default("rascunho"),
    paymentConditions: text("payment_conditions"),
    discount: money("discount").notNull().default(0),
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    check(
      "quotes_status_check",
      sql`${table.status} in ('rascunho', 'enviado', 'aprovado', 'recusado', 'concluido')`,
    ),
  ],
);

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
  quantity: integer("quantity").notNull().default(1),
  unitPrice: money("unit_price"),
  totalPrice: money("total_price").notNull().default(0),
});

export const quoteItemDimensions = sqliteTable("quote_item_dimensions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  quoteItemId: integer("quote_item_id")
    .notNull()
    .references(() => quoteItems.id, { onDelete: "cascade" }),
  label: text("label"),
  width: real("width"),
  height: real("height"),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: money("unit_price"),
  totalPrice: money("total_price").notNull().default(0),
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
