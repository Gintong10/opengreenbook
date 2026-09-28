# OpenGreenBook

Quizlet-style study tool for *A Practical Guide to Quantitative Finance Interviews* by Xinfeng Zhou, the quant interview "Green Book".

**Live:** https://gintong.dev/opengreenbook/

- **Flashcards**: flip cards, sort them into *Know* / *Still learning*, shuffle, swipe on mobile
- **Learn**: adaptive rounds of multiple choice, then written recall until every card is mastered
- **Test**: generated practice tests mixing multiple choice, true/false and matching, with a graded review
- **Match**: race the clock pairing problems with their answers
- Filter by section, star cards, full-text search, dark mode, and progress saved in your browser

Cards cover Chapters 2–7 (brain teasers, calculus and linear algebra, probability, stochastic calculus, finance, algorithms and numerical methods). Each card has a question, a short answer, three plausible wrong answers for the quiz modes, and a worked explanation, with math rendered by KaTeX.

The cards are original summaries written for review. They are not the book's text, so get the book for the full treatment. Where the book has a known slip, the card uses the corrected answer and says so in its explanation.

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
  "hint": "optional"
}
```

## Deploy

`gintong.dev` is the GitHub Pages site of the [`portfolio`](https://github.com/Gintong10/portfolio) repo. To deploy, the build is copied into `portfolio/public/opengreenbook/`, and the portfolio's existing Pages workflow publishes it at `/opengreenbook/`:

```sh
npm run deploy     # validate, build, copy into ../portfolio/public/opengreenbook, commit + push
```

If the portfolio checkout lives somewhere other than `../portfolio`, set `PORTFOLIO_DIR`.
