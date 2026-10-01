"""Top-level package for the SmartLib backend.

The original project structure expected a ``backend`` package so tests could use
imports like ``from backend.app.recommendation.personalized import ...``.
Creating an empty ``__init__`` file makes this directory a proper Python
package and resolves the ImportError observed during test collection.
"""