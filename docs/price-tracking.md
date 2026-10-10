# Price collection setup

## Scope and safety

The daily job records append-only retailer observations in `price_observations`
and execution summaries in `price_collection_runs`. It does not write to
`products`, `offers`, or `history`; existing demo data and administrator edits
therefore remain untouched. A successful observation without a verified exact
catalog variant remains unlinked (`catalog_product_id` is `NULL`).

The collector reads only JSON-LD `Product`/`Offer` data, requires the expected
model and any listed package variant, accepts only positive numeric `MAD`
prices, and checks each retailer's `robots.txt`. The most-specific matching
user-agent group takes precedence over wildcard rules; the longest matching
path wins, with `Allow` winning an equal-length conflict. It does not follow
redirects, solve challenges, or retry denied requests. A denied, inaccessible,
or unparseable source produces a failure observation. Robots responses must be
successful `text/plain` policies with parseable directives and a matching
user-agent group; HTML/challenge responses, malformed policies, missing
content types, and server errors fail closed without a product-page request.
Only an actual HTTP 404 from `/robots.txt` is treated as no published policy;
it permits the product request after the normal host and redirect checks.
This is an explicit operational policy, not evidence that the retailer permits
collection. Out-of-stock observations are recorded as such; the latest in-stock
price remains available in earlier observations.

Before any retailer request, the collector checks that both tracking tables
exist and stops if the migration has not been deployed. Product and robots
requests are restricted to the configured HTTPS retailer hosts, and redirects
are refused. The offline tests run in GitHub Actions before collection. They do
not demonstrate that any retailer permits collection or that its pages expose
the expected JSON-LD; verify retailer terms and permitted structured-data
formats separately before enabling the production secret or schedule.

The supplied target list contains 17 entries and 16 unique URLs (the UltraPC
Ryzen 3 3100 URL was repeated). The existing catalog has general Ryzen 5 5600
and Ryzen 7 5700X entries, but does not identify their box/tray variants.
The other requested models do not have exact catalog entries. Consequently,
all initial source mappings are deliberately unlinked until exact variant
associations are confirmed. The job collects observations independently and
does not treat product-name similarity as a catalog mapping.

## Configure GitHub Actions

Do not add the production secret or allow live collection until the retailer
terms and each retailer's permitted structured-data format have been reviewed
separately. The workflow can run after its files reach the default branch; if
that review is incomplete, leave `DATABASE_URL` unset so the collector exits
before creating a database connection or making retailer requests.

1. Confirm retailer terms and permitted product data formats first. This
   implementation has not verified compatibility with any live retailer.
2. In VS Code, use **Source Control** to review the new files, stage only the
   intended additions, commit, and push to the GitHub repository's default
   branch. Do not add database credentials to any project file.
3. Confirm in Vercel that the app's `DATABASE_URL` production environment
   variable points to the intended Neon/PostgreSQL database. Wait for the
   deployment triggered by the push to succeed. The existing
   `npm run build` migration step applies `migrations/0004_price_tracking.sql`.
4. Only after the review in step 1 and the successful migration, add the
   GitHub Actions secret `DATABASE_URL` under **Settings → Secrets and
   variables → Actions**. Use the intended production Neon/PostgreSQL
   connection string; do not place it in workflow YAML, source code, or a
   commit.
5. In **Actions**, enable workflows if GitHub prompts. GitHub schedules this
   event only on the default branch. Manual runs are guarded by
   `github.event.repository.default_branch` and skip if that value is missing
   or the selected ref is not the default branch; no branch name is hardcoded.
   After the deployment succeeds, run **Daily price collection → Run workflow**
   on the default branch and inspect the offline test step before any
   collection outcome. The workflow also runs daily at 06:17 UTC.
6. Review the resulting observations. Only after
   confirming a source's exact catalog model and package variant should an
   explicit mapping/update policy be added. Do not map the existing 5600 or
   5700X catalog rows to tray/box listings merely because the model number
   matches.

The collector uses only the `DATABASE_URL` secret. It requires no additional
package: `pg` is already a production dependency. If the source page does not
provide matching JSON-LD, collection records a failure; adding a retailer-
specific parser should wait until its permitted markup can be represented by
a saved fixture and tested without live-page dependence. Do not treat the
offline tests as evidence of retailer compatibility or permission.
