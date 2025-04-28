install:
	pnpm install
.PHONY: install

update-internal:
	pnpm update "@breeze32/*" --latest
.PHONY: update-internal-packages

publish:
	-$(MAKE) check
	-$(MAKE) push COMMIT=$(COMMIT)
	pnpm version $(VERSION)
	pnpm publish --access public
.PHONY: publish

publish-beta:
	-$(MAKE) check
	-$(MAKE) push COMMIT=$(COMMIT)
	pnpm version prerelease --preid=beta
	pnpm publish --access public --tag beta
.PHONY: publish-beta

install-beta:
	pnpm install $(PACKAGE)@beta
.PHONY: install-beta

check:
	pnpm exec biome check .
	pnpm exec npmPkgJsonLint -c ./.npmpackagejsonlintrc.json ./**/package.json
.PHONY: check

push:
	git add .
	git commit -m $(COMMIT)
	git push
.PHONY: push