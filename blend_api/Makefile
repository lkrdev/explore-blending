.PHONY: test pytest

test:
	PYTHONPATH=. uv run pytest

freeze:
	uv pip freeze > requirements.txt

ff:
	uv run functions-framework --target=hello_world --port=9576

deploy:
	gcloud functions deploy blend-api \
		--gen2 \
		--runtime=python312 \
		--region=us-central1 \
		--source=. \
		--entry-point=hello_world \
		--trigger-http \
		--allow-unauthenticated
