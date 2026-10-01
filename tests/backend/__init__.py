"""Namespace shim for the real :mod:`backend` package.

The test suite imports ``backend.app`` from the top‑level project root.  When
Pytest runs, it first adds each test directory to ``sys.path`` which means a
plain import of ``backend`` will look for a local package under
``tests/backend`` – which does not exist and causes an ImportError.

To resolve this we expose a namespace package that delegates module lookup to
the actual backend located one level up from the tests directory.  By setting
``__path__`` to point directly at ``<repo_root>/backend`` Python will search
that directory for submodules such as ``app``.
"""

import os
from pathlib import Path
# Compute repository root (two levels up from this file)
repo_root = Path(__file__).resolve().parents[2]
# Point the package search path to the real backend directory
__path__ = [str(repo_root / "backend")]