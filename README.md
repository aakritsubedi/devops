# Modern Backend Engineering

A static course reader with ten chapters, from the first Git commit through local development, containers, AWS and Terraform. Every code file appears as a separate editor section with syntax highlighting, line numbers, copy/download controls and explanatory notes. There are no code tabs or tables.

The course uses a Python 3.13 learning baseline with uv, FastAPI lifespan, Pydantic 2, SQLAlchemy 2.0 async sessions over Psycopg 3, Alembic migrations, .env secrets, TaskIQ Streams, PostgreSQL 17, Redis locally and TLS Valkey in AWS. It includes 20 architecture/flow diagrams, 49 command walkthroughs and a connected Terraform lab with resource explanations.

## Run locally

From this directory, run:

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000>. Use a local server or static hosting: opening `index.html` directly with `file://` will not load the JavaScript modules and JSON configuration. No build or package installation is required. Fonts and Tailwind load from their existing external CDNs.

The backend project created while following the course is separate from this reader. Its Compose API uses <http://localhost:8001> so the two applications can run together.

## Learning path

1. Repository setup, terminal commands, Git, Python basics and uv.
2. Typed API, SQLAlchemy models and async sessions, Alembic migrations, .env settings, tests and a locked non-root container.
3. Networking: CIDR, subnets, routes, DNS and security groups.
4. Data, managed secrets, TLS and the three IAM identities.
5. ECR, task definitions, Fargate, migrations and load balancing.
6. Optional ECS-on-EC2 hosts and capacity providers.
7. Metrics, scaling feedback, bounded load tests and simulator.
8. HCL fundamentals, state, resource walkthroughs and phased Terraform deployment.
9. Quality checks, scoped GitHub OIDC publication and reviewed releases.
10. Logs, alerts, container/host inspection, recovery and teardown.

Chapters 3–6 offer a manual learning path. Chapter 8 creates a separate Terraform stack; it does not adopt the manual resources. Cloud exercises incur charges and require the learner's own AWS account. The course distinguishes disposable-lab settings from production requirements. No AWS deployment occurs when running the reader.

## Edit course content

- `config/course.json` controls the page title, course name, tagline, logo text, chapter labels, browser storage keys, and chapter order.
- `config/chapters/*.json` contains one chapter per file. Edit these files to change lesson content without changing HTML or JavaScript.
- Chapter paths in `course.json` are relative to that configuration file. Add, remove, or reorder entries in its `chapters` array to change the curriculum. The duration badge, navigation, and checklist totals update automatically.

Each chapter has these fields:

- `week`: positive chapter/week number, independent of its position in the curriculum.
- `mode`, `title`, `subtitle`, `phase`, `analogy`: introductory lesson content.
- `handHoldingSteps`, `concepts`: ordered lists of lesson steps and engineering concepts. A concept's first colon separates its emphasized title from its explanation.
- `objectives`, `prerequisites`: lists shown before the lesson.
- `lessons`: sections with `title`, `body` (paragraph strings), and optional `bullets`.
- `commands`: ordered `{ "command": "...", "explanation": "...", "expected": "..." }` walkthroughs. Commands are displayed and copied; the reader never executes them.
- `svgDiagram`: the architecture illustration as an SVG string.
- `architectureDescription`, `flowDiagram`, `flowDescription`: architecture caption and a separate process-flow illustration/caption.
- `codeFiles`: an ordered list of `{ "filename": "app/main.py", "code": "..." }` objects. All files appear as individual sections, each with its own copy button. Include at least one file.
- Code files can include `language`, `description`, and `walkthrough` entries with `title` and `explanation`. Supported bundled syntax grammars are Python, Bash, JSON, YAML, Dockerfile (`docker`), TOML, SQL and HCL. Unknown languages display escaped plain text. Downloads preserve the exact source text; learners must place files in their displayed directories.
- `breakItDrill`: `title`, `scenario`, `symptom`, and `fix` for the failure exercise.
- `assignment`: `title`, `description`, and an optional `completionHint`.
- `recallNote`: `keyTakeaway` and a list of `bullets`.
- `checklist`: a list of `{ "id": "w1-c1", "text": "..." }` objects.
- `badgeTone`: `indigo` or `amber` (the default).
- `simulator`: optional capacity exercise configuration. Chapter 7 includes all slider labels, units, ranges, defaults, demand waves, timing, capacity settings, and the caption. Omit this field to hide the simulator.
- `sources`: official reference links with `label` and an HTTPS `url`.

To create a chapter, copy an existing chapter file, edit its content, give every checklist item a new unique ID, then add its path to `config/course.json`. Keep existing checklist IDs and storage keys unchanged to retain learners' saved progress. JSON strings use `\n` for newlines; double quotes and backslashes within code must be escaped. Prose supports inline backticks and bold markers and escapes other markup. SVG diagrams are trusted, repository-authored markup.

Invalid JSON, missing chapter files, invalid required fields, and duplicate checklist IDs show a loading error in the reader.

## Source files

- `index.html`: page shell and navigation controls.
- `js/app.js`: course rendering, navigation, copy buttons, theme, and checklist progress.
- `js/course-loader.js`: configuration loading and validation.
- `js/content-view.js`: lesson sections, diagrams' surrounding content, editor presentation and syntax highlighting.
- `js/simulator.js`: the interactive capacity simulator.
- `js/tailwind-config.js`: Tailwind theme setup.
- `css/styles.css`: custom styles.
- `vendor/prism.js`: bundled Prism 1.30.0 language grammars, licensed in `vendor/PRISM-LICENSE`.

## Verification

With Node.js 22 or newer:

```sh
npm test
```

No npm dependencies need installing. Tests validate the whole curriculum, progress IDs, teaching-content schemas, shared examples, escaping and Bash syntax without executing the displayed commands.

The sample backend was checked with Ruff, four async HTTP contract tests and three settings tests. An isolated Compose run verified image builds, migration-before-service startup, queued job persistence, duplicate-delivery deduplication and transaction rollback. Alembic checks covered repeat upgrades, autogenerated column changes, downgrade/re-upgrade and preservation of existing rows. Its Compose configuration and all diagram SVGs were parsed. The complete Terraform examples were formatted and validated with Terraform 1.16.6 and AWS provider 6.71.0, without creating cloud resources. Browser checks covered every chapter, exact displayed/copied/downloaded code, highlighting, line numbers, diagrams, progress, theme and simulator. AWS deployment still requires the learner's cloud environment.
