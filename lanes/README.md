# PR Lane Receipts

Lane receipts make the rule **one AI chat instance = one branch + one pull request** inspectable.

Each lane adds one Markdown receipt containing:

- date and bounded purpose;
- branch and base commit;
- chat ownership statement;
- files or experiment scope;
- verification commands and results;
- pull request or handoff state; and
- merge authority.

Receipts are append-only evidence. Correct a receipt with a clearly dated amendment; do not silently rewrite prior outcomes or erase a failed lane.
