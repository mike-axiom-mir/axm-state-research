"""Beginner-friendly complete experiment launcher."""

from __future__ import annotations

import subprocess
import sys

from sentinel.benchmark import run_suite


def main() -> None:
    print("[1/2] Running Sentinel tests...")
    completed = subprocess.run(
        [sys.executable, "-m", "unittest", "discover", "-s", "tests", "-v"],
        check=False,
    )
    if completed.returncode:
        raise SystemExit("Tests failed; benchmark stopped.")
    print("[2/2] Running dependency-bug and repaired comparisons...")
    result = run_suite()
    repaired = result["repaired_run"]["totals"]
    print(f"Complete. Repaired missed wakeups: {repaired['missed_wakeups']}")
    print("Read FINAL_REPORT.md and results/SENTINEL_RESULTS.md")


if __name__ == "__main__":
    main()
