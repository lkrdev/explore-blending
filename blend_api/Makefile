.PHONY: test pytest

test:
	PYTHONPATH=. uv run pytest

freeze:
	uv pip freeze > requirements.txt

dev:
	uv run functions-framework --target=main --port=9576

tunnel:
	cloudflared tunnel --url http://localhost:9576

deploy:
	gcloud functions deploy blend-api \
		--gen2 \
		--runtime=python312 \
		--region=us-central1 \
		--source=. \
		--entry-point=main \
		--trigger-http \
		--allow-unauthenticated