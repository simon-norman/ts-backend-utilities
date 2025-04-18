install:
	pnpm install
.PHONY: install

update-internal:
	pnpm update "@breeze32/*" --latest
.PHONY: update-internal-packages

publish:
	git add .
	git commit -m $(COMMIT_MESSAGE)
	tsup
	pnpm version $(VERSION)
	pnpm publish --access public
.PHONY: publish