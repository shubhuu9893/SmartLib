-- Migration script to initialize SmartLib tables in a Cloudflare D1 database.
-- This script uses standard SQLite syntax which is fully supported by
-- Cloudflare D1. The `CREATE TABLE IF NOT EXISTS` form ensures we do not
-- overwrite an existing schema or data.

-- ----------------------------------------------------------------------
-- Users
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'STUDENT' NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ----------------------------------------------------------------------
-- Interests
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

-- ----------------------------------------------------------------------
-- User–Interest many‑to‑many join table
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_interests (
    user_id INTEGER NOT NULL,
    interest_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, interest_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(interest_id) REFERENCES interests(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------
-- Books
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    open_library_key TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    subtitle TEXT,
    authors TEXT,
    description TEXT,
    subjects TEXT,
    genres TEXT,
    cover_url TEXT,
    published_date DATETIME,
    publisher TEXT,
    isbn TEXT,
    page_count INTEGER,
    language TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ----------------------------------------------------------------------
-- Reading History
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reading_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_read_at DATETIME,
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    reading_time INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------
-- Ratings
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    rating INTEGER NOT NULL,Modify my existing SmartLib project so that Firebase Authentication and Cloudflare D1 have clearly separated responsibilities.

IMPORTANT ARCHITECTURE:

Firebase Authentication = ONLY authentication.

Cloudflare D1 = SmartLib application/user data.

Do NOT store passwords in D1.

Do NOT create a second authentication system.

Do NOT use PostgreSQL.

Do NOT create duplicate users.

Inspect the existing project first and modify the existing architecture instead of rewriting it.

==================================================
AUTHENTICATION RESPONSIBILITY
=============================

Firebase Authentication must handle:

* Email + Password registration
* Email + Password login
* Logout
* Password reset
* Authentication session
* Firebase UID
* Firebase ID token

Cloudflare D1 must handle:

* User profile
* User interests
* Favorites
* Ratings
* Reading history
* Book data
* Recommendations
* Other SmartLib application data

NEVER store:

password
password_hash

in Cloudflare D1.

==================================================
REGISTRATION FLOW
=================

When a new user registers:

STEP 1:

React calls Firebase:

createUserWithEmailAndPassword()

Firebase creates the authentication account.

Firebase returns:

uid
email

STEP 2:

Get the Firebase ID token for the authenticated user.

STEP 3:

Send the Firebase ID token and required profile information to FastAPI.

Example:

Authorization: Bearer <Firebase_ID_Token>

STEP 4:

FastAPI verifies the Firebase ID token.

DO NOT trust a user_id sent directly from React.

Get the authenticated Firebase UID from the verified Firebase token.

STEP 5:

FastAPI checks Cloudflare D1:

SELECT user FROM users WHERE firebase_uid = ?

STEP 6:

If the user does NOT exist, create the SmartLib application user.

Example:

users

id
firebase_uid
name
email
created_at
updated_at

STEP 7:

Return the application user/profile to React.

==================================================
USER TABLE
==========

Inspect the existing users table/model.

The user record must associate:

Firebase Authentication UID
↓
SmartLib D1 user

Example:

Firebase:
uid = abc123

D1:

users
id = 42
firebase_uid = abc123
name = Shubham
email = [user@gmail.com](mailto:user@gmail.com)

Use a UNIQUE constraint on firebase_uid where appropriate.

Do NOT create another user record when the same Firebase user logs in again.

==================================================
USER INTERESTS
==============

User interests must be stored in D1.

For example:

user_interests

id
user_id
interest/category
created_at

OR use the existing project schema if already implemented.

Interests can represent:

* AI
* Machine Learning
* Programming
* Cybersecurity
* Data Science
* Fiction
* Science
* History
* etc.

Use the actual existing schema if available.

These interests will later be used by the recommendation system.

==================================================
FAVORITES
=========

When a user favorites a book:

Firebase identifies the user
↓
FastAPI verifies Firebase token
↓
Firebase UID obtained
↓
D1 user found
↓
favorite inserted into favorites table

Example:

favorites

id
user_id
book_id
created_at

The combination:

user_id + book_id

should prevent duplicate favorites if appropriate.

==================================================
RATINGS
=======

When a user rates a book:

Firebase authentication
↓
Firebase UID
↓
FastAPI
↓
D1 user
↓
ratings table

Example:

ratings

id
user_id
book_id
rating
created_at
updated_at

A user should normally have only one current rating for a particular book.

Use an appropriate UNIQUE constraint:

UNIQUE(user_id, book_id)

if that matches the existing application design.

==================================================
READING HISTORY
===============

When a user reads/views a book:

Store the activity in:

reading_history

Example:

id
user_id
book_id
started_at
last_read_at
progress
status

Possible status:

reading
completed
want_to_read

Use the existing project schema if already implemented.

==================================================
RECOMMENDATIONS
===============

The recommendation system uses:

TF-IDF + Cosine Similarity.

It should use D1 user activity such as:

* user interests
* books viewed
* books read
* favorites
* ratings
* categories
* authors

Example:

User:
Shubham

Interests:
AI
Python
Machine Learning

Favorites:
Python Programming
Deep Learning

Ratings:
Deep Learning = 5
Python Programming = 4

Reading history:
Machine Learning Fundamentals

The recommendation service should use this information to generate personalized recommendations.

Do NOT store passwords or Firebase authentication credentials for recommendation purposes.

==================================================
LOGIN FLOW
==========

When a user logs in:

1. React uses Firebase:

signInWithEmailAndPassword()

2. Firebase authenticates the user.

3. React obtains the Firebase ID token.

4. React sends the token to FastAPI.

5. FastAPI verifies the token.

6. FastAPI extracts:

firebase_uid

7. FastAPI finds:

users.firebase_uid

8. FastAPI returns the user's SmartLib profile and required application data.

Do NOT create another user if the user already exists.

==================================================
PROTECTED API
=============

All user-specific FastAPI endpoints must require Firebase authentication.

Examples:

GET /api/users/me

GET /api/users/me/favorites

POST /api/users/me/favorites

GET /api/users/me/ratings

POST /api/users/me/ratings

GET /api/users/me/history

POST /api/users/me/history

GET /api/users/me/interests

PUT /api/users/me/interests

GET /api/recommendations

Use the existing API structure if these routes already exist.

Do NOT create duplicate endpoints unnecessarily.

==================================================
AUTHORIZATION
=============

Never trust:

user_id

firebase_uid

email

sent directly from the frontend as the source of identity.

The backend must determine the authenticated user from:

Authorization: Bearer <Firebase_ID_Token>

Then:

Firebase ID Token
↓
Firebase UID
↓
D1 users.firebase_uid
↓
D1 user.id
↓
User activity tables

==================================================
DATABASE RELATIONSHIPS
======================

Ensure user activity tables reference the correct user.

Conceptually:

users
│
├── user_interests
│
├── favorites
│       └── books
│
├── ratings
│       └── books
│
├── reading_history
│       └── books
│
└── recommendations

Do not duplicate user information in every activity table.

Use foreign keys where supported by the existing D1 schema.

==================================================
REGISTRATION TRANSACTION / FAILURE HANDLING
===========================================

Handle this situation carefully:

Firebase registration succeeds
BUT
D1 user creation fails.

Do NOT silently ignore the D1 failure.

Return an appropriate error and log only safe diagnostic information.

Handle duplicate registration safely.

Handle:

Firebase account already exists
D1 user already exists
D1 connection failure
invalid Firebase token
expired Firebase token
missing Firebase token

Do not expose secrets.

==================================================
ENVIRONMENT
===========

Frontend Firebase configuration can use:

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

Backend Firebase Admin configuration must remain backend-only.

Cloudflare configuration remains backend/server-side:

CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
D1_DATABASE_ID=

There is NO DATABASE_URL.

Do NOT add DATABASE_URL.

==================================================
PYTHON VIRTUAL ENVIRONMENT
==========================

My backend virtual environment is:

backend/venv

If any Python package is required:

cd backend
source venv/bin/activate

Verify:

which python
which pip

Both must point inside:

backend/venv/

Install packages ONLY there.

For example:

python -m pip install firebase-admin

Do NOT install Python packages globally.

Do NOT use:

sudo pip
system pip
global Python packages

==================================================
IMPLEMENTATION
==============

Inspect the existing project and then implement the complete flow.

Check:

Firebase configuration
AuthContext
Login
Register
ProtectedRoute
API service
FastAPI authentication dependency
Firebase Admin SDK
users table
user activity tables
D1 queries
D1 migrations

Modify the actual files.

Do not just provide theoretical code.

==================================================
TESTING
=======

Actually test the complete flow.

TEST 1:

Register a new user.

Verify:

Firebase Authentication
+
D1 users table

Both contain the corresponding user.

TEST 2:

Login with the same user.

Verify:

No duplicate D1 user is created.

TEST 3:

Add an interest.

Verify:

It appears in user_interests.

TEST 4:

Favorite a book.

Verify:

It appears in favorites.

TEST 5:

Rate a book.

Verify:

It appears in ratings.

TEST 6:

Read/view a book.

Verify:

It appears in reading_history.

TEST 7:

Request recommendations.

Verify:

The recommendation system can retrieve the user's activity.

TEST 8:

Logout.

Verify:

Protected APIs cannot be accessed without valid Firebase authentication.

TEST 9:

Refresh the browser after login.

Verify:

Firebase authentication state is restored.

==================================================
FINAL DATABASE CHECK
====================

After implementation, inspect the D1 schema.

Verify:

users
user_interests
favorites
ratings
reading_history

and every other relevant SmartLib table.

Verify:

primary keys
foreign keys
unique constraints
indexes

Do not delete existing data.

==================================================
FINAL REPORT
============

Provide:

AUTHENTICATION:
Firebase Email + Password

APPLICATION DATABASE:
Cloudflare D1

USER MAPPING:
Firebase UID → D1 users.firebase_uid

TABLES USED:
...

REGISTRATION FLOW:
...

LOGIN FLOW:
...

FAVORITE FLOW:
...

RATING FLOW:
...

INTEREST FLOW:
...

READING HISTORY FLOW:
...

RECOMMENDATION FLOW:
...

FILES CHANGED:
...

PYTHON PACKAGES INSTALLED:
...

VENV USED:
backend/venv

TEST RESULTS:
Registration: PASS/FAIL
Login: PASS/FAIL
D1 user creation: PASS/FAIL
Interests: PASS/FAIL
Favorites: PASS/FAIL
Ratings: PASS/FAIL
Reading history: PASS/FAIL
Recommendations: PASS/FAIL
Protected API: PASS/FAIL

IMPORTANT:

Do not claim PASS unless you actually tested it.

Start by inspecting the existing SmartLib code and implement the Firebase Authentication → FastAPI → Cloudflare D1 user/activity flow.

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE,
    UNIQUE(user_id, book_id)
);

-- ----------------------------------------------------------------------
-- Favorites
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE,
    UNIQUE(user_id, book_id)
);

-- ----------------------------------------------------------------------
-- Recommendations
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    score REAL NOT NULL,
    reason TEXT,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------
-- Indexes (used by SQLAlchemy `index=True` columns)
-- ----------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_books_open_library_key ON books(open_library_key);