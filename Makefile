NODE_BIN = ./node_modules/.bin

.PHONY: dist
dist:
	env PROD=true ${NODE_BIN}/webpack-cli

.PHONY: dev
dev:
	${NODE_BIN}/webpack-cli --watch

.PHONY: test
test: dist
	${NODE_BIN}/mocha -r ts-node/register test/*.ts

.PHONY: deploy
deploy:
	rsync -avz ./ cubing.net:~/experiments.cubing.net/twisty.js/ \
		--exclude .git \
		--exclude node_modules/

	ssh cubing.net mkdir -p /home/lgarron/experiments.cubing.net/twisty.js/node_modules/alg/dist/
	rsync -avz ./node_modules/alg/dist/alg.js cubing.net:~/experiments.cubing.net/twisty.js/node_modules/alg/dist/alg.js

	ssh cubing.net mkdir -p /home/lgarron/experiments.cubing.net/twisty.js/node_modules/kpuzzle/dist/
	rsync -avz ./node_modules/kpuzzle/dist/kpuzzle.js cubing.net:~/experiments.cubing.net/twisty.js/node_modules/kpuzzle/dist/kpuzzle.js


clean:
	rm -rf ./dist
