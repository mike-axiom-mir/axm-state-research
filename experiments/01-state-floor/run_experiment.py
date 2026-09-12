"""Beginner-friendly entry point for the complete local experiment."""

from __future__ import annotations

import subprocess
import sys

from axm_state_floor.benchmark import run_benchmark_suite


def main() -> None:
    print("[1/2] Running correctness tests...")
    completed = subprocess.run(
        [sys.executable, "-m", "unittest", "discover", "-s", "tests", "-v"],
        check=False,
    )
    if completed.returncode != 0:
        raise SystemExit("Tests failed; benchmark stopped.")
    print("[2/2] Running 10 / 100 / 1,000 / 10,000-node benchmark...")
    result = run_benchmark_suite()
    print(f"Complete in {result['suite_wall_time_seconds']:.3f} seconds.")
    print("Read FINAL_REPORT.md and results/BENCHMARK_RESULTS.md")


if __name__ == "__main__":
    main()
