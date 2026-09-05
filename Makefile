-include .deploy/release.env
export ZILET_IMAGE RELEASE_SHA

.PHONY: setup up down logs dev seed test backup restore owner deploy-status
setup:
	@sh scripts/setup.sh
up: setup
	@rm -f .deploy/paused
	docker compose up -d --build --wait
	@sed -n 's/^APP_URL=/Žilet: /p' .env
down:
	@if [ -f .deploy/release.env ]; then touch .deploy/paused; fi
	docker compose down
logs:
	docker compose logs -f --tail=100 app
dev: setup
	docker compose -f compose.yaml -f compose.dev.yaml up -d db mail
	SMTP_HOST=localhost npm run dev
seed:
	docker compose exec -e ALLOW_DEMO_SEED=true app npm run seed
owner:
	docker compose exec app npm run owner -- $(ARGS)
test:
	npm test
	npm run typecheck
	bash tests/deployment.sh
backup:
	@bash scripts/backup.sh
restore:
	@test -n "$(BACKUP)" || (echo 'Koristite: make restore BACKUP=backups/ime'; exit 1)
	@bash scripts/restore.sh "$(BACKUP)"
deploy-status:
	@cat .deploy/current
	@systemctl status zilet-deploy.timer --no-pager
