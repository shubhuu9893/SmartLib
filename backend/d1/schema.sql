-- SmartLib schema for Cloudflare D1.
-- Apply with: npx wrangler d1 execute <database-name> --remote --file backend/d1/schema.sql
-- The backend also creates missing tables automatically on startup.

CREATE TABLE IF NOT EXISTS books (
	id INTEGER NOT NULL PRIMARY KEY,
	title VARCHAR(255) NOT NULL,
	author VARCHAR(255),
	category VARCHAR(100),
	description TEXT,
	keywords TEXT,
	pdf_url TEXT,
	created_at TEXT DEFAULT CURRENT_TIMESTAMP,
	ol_key VARCHAR(32),
	author_keys TEXT,
	cover_id INTEGER,
	first_publish_year INTEGER,
	isbn VARCHAR(20),
	publisher VARCHAR(255),
	language VARCHAR(50),
	pages INTEGER,
	ratings_average REAL,
	ratings_count INTEGER,
	ebook_access VARCHAR(32),
	ia_id VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS "ix_books_id" ON books ("id");
CREATE UNIQUE INDEX IF NOT EXISTS "ix_books_ol_key" ON books ("ol_key");

CREATE TABLE IF NOT EXISTS users (
	id INTEGER NOT NULL PRIMARY KEY,
	firebase_uid VARCHAR(128) NOT NULL,
	email VARCHAR(255),
	name VARCHAR(255),
	avatar_url TEXT,
	bio TEXT,
	preferences TEXT,
	onboarded INTEGER NOT NULL,
	created_at TEXT DEFAULT CURRENT_TIMESTAMP,
	updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "ix_users_firebase_uid" ON users ("firebase_uid");
CREATE INDEX IF NOT EXISTS "ix_users_id" ON users ("id");

CREATE TABLE IF NOT EXISTS favorites (
	id INTEGER NOT NULL PRIMARY KEY,
	user_id INTEGER NOT NULL,
	book_id INTEGER NOT NULL,
	created_at TEXT DEFAULT CURRENT_TIMESTAMP,
	UNIQUE (user_id, book_id),
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE,
	FOREIGN KEY(book_id) REFERENCES books (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ix_favorites_user_id" ON favorites ("user_id");

CREATE TABLE IF NOT EXISTS library_entries (
	id INTEGER NOT NULL PRIMARY KEY,
	user_id INTEGER NOT NULL,
	book_id INTEGER NOT NULL,
	status VARCHAR(20) NOT NULL,
	progress INTEGER NOT NULL,
	created_at TEXT DEFAULT CURRENT_TIMESTAMP,
	updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
	UNIQUE (user_id, book_id),
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE,
	FOREIGN KEY(book_id) REFERENCES books (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ix_library_entries_user_id" ON library_entries ("user_id");

CREATE TABLE IF NOT EXISTS notifications (
	id INTEGER NOT NULL PRIMARY KEY,
	user_id INTEGER NOT NULL,
	kind VARCHAR(40) NOT NULL,
	title VARCHAR(255) NOT NULL,
	message TEXT,
	link VARCHAR(255),
	dedupe_key VARCHAR(255),
	read INTEGER NOT NULL,
	created_at TEXT DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ix_notifications_created_at" ON notifications ("created_at");
CREATE INDEX IF NOT EXISTS "ix_notifications_dedupe_key" ON notifications ("dedupe_key");
CREATE INDEX IF NOT EXISTS "ix_notifications_user_id" ON notifications ("user_id");

CREATE TABLE IF NOT EXISTS ratings (
	id INTEGER NOT NULL PRIMARY KEY,
	user_id INTEGER NOT NULL,
	book_id INTEGER NOT NULL,
	rating INTEGER NOT NULL,
	created_at TEXT DEFAULT CURRENT_TIMESTAMP,
	updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
	UNIQUE (user_id, book_id),
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE,
	FOREIGN KEY(book_id) REFERENCES books (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ix_ratings_user_id" ON ratings ("user_id");

CREATE TABLE IF NOT EXISTS reading_history (
	id INTEGER NOT NULL PRIMARY KEY,
	user_id INTEGER NOT NULL,
	book_id INTEGER NOT NULL,
	action VARCHAR(20) NOT NULL,
	created_at TEXT DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE,
	FOREIGN KEY(book_id) REFERENCES books (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ix_reading_history_created_at" ON reading_history ("created_at");
CREATE INDEX IF NOT EXISTS "ix_reading_history_user_id" ON reading_history ("user_id");

CREATE TABLE IF NOT EXISTS search_history (
	id INTEGER NOT NULL PRIMARY KEY,
	user_id INTEGER NOT NULL,
	query VARCHAR(255) NOT NULL,
	created_at TEXT DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ix_search_history_created_at" ON search_history ("created_at");
CREATE INDEX IF NOT EXISTS "ix_search_history_user_id" ON search_history ("user_id");

CREATE TABLE IF NOT EXISTS user_interests (
	id INTEGER NOT NULL PRIMARY KEY,
	user_id INTEGER NOT NULL,
	interest VARCHAR(100) NOT NULL,
	created_at TEXT DEFAULT CURRENT_TIMESTAMP,
	UNIQUE (user_id, interest),
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ix_user_interests_user_id" ON user_interests ("user_id");

