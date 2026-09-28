# OpenGreenBook

Problem trainer for *A Practical Guide to Quantitative Finance Interviews* by Xinfeng Zhou, the quant interview "Green Book".

**Live:** https://gintong.dev/opengreenbook/

- **One problem at a time.** Each page shows a question and an answer box, with instant grading, unlimited retries, hints, and a worked solution.
- **Grading.** Numeric answers accept fractions, decimals, percents and expressions (`5/11`, `0.4545`, `1-(5/6)^2`, `C(52,5)`, `sqrt(2/pi)`). Short answers ignore capitalization and extra filler words. Formula and concept questions are multiple choice.
- **Navigation.** A chapter → section → problem sidebar, numbered problems (`4.3.17`), prev/next with ← →, Enter to submit and continue, search, and a random-problem button.
- **Practice sets.** Pick chapters or sections, answer types and a size, optionally skip solved problems, and get a first-try score and a list of missed problems to retry.
- **Progress.** Each problem is marked solved, attempted or revealed. The site also tracks bookmarks and a first-try streak, all saved in your browser.

The problems cover Chapters 2–7 (brain teasers, calculus and linear algebra, probability, stochastic calculus, finance, algorithms and numerical methods). The problems and solutions are original rewrites for practice, not the book's text. Where the book has a known slip, the solution uses the corrected answer and says so.

## Develop

```sh
npm install
npm run dev        # http://localhost:5173/opengreenbook/
npm run validate   # schema + KaTeX check for every card file
npm run build
```

Card data lives in `src/data/ch*.json`. Every card has this shape:

```json
{
  "id": "4-drunk-passenger",
  "section": "4.1",
  "name": "Drunk passenger",
  "kind": "problem",
  "page": 62,
  "prompt": "Question text, $inline$ or $$display$$ math",
  "answer": "Short answer (≤ 110 chars)",
  "explanation": "Worked reasoning. Lines starting with '- ' become bullets.",
  "distractors": ["wrong 1", "wrong 2", "wrong 3"],
  "hint": "optional",
  "check": { "type": "number", "value": 0.4545, "examples": ["5/11"], "unit": "optional" }
}
```

`check` controls grading: `number` (auto-graded value, `examples` must be accepted), `text` (`accept`: list of short answers), or omitted for multiple choice between `answer` and `distractors`. `npm run validate` runs every example through the grader.

## Deploy

`gintong.dev` is the GitHub Pages site of the [`portfolio`](https://github.com/Gintong10/portfolio) repo. To deploy, the build is copied into `portfolio/public/opengreenbook/`, and the portfolio's existing Pages workflow publishes it at `/opengreenbook/`:

```sh
npm run deploy     # validate, build, copy into ../portfolio/public/opengreenbook, commit + push
```

If the portfolio checkout lives somewhere other than `../portfolio`, set `PORTFOLIO_DIR`.
