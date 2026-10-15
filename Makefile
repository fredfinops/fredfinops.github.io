.PHONY: check
check:
	node --test scripts/check-capabilities.test.mjs
	node scripts/check-capabilities.mjs
