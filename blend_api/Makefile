.PHONY: test pytest

test:
	PYTHONPATH=. uv run pytest

freeze:
	uv pip freeze > requirements.txt

ff:
	uv run functions-framework --target=main --port=9576

deploy:
	gcloud functions deploy blend-api \
		--gen2 \
		--runtime=python312 \
		--region=us-central1 \
		--source=. \
		--entry-point=main \
		--trigger-http \
		--allow-unauthenticated

cdn:
	gcloud storage cp dist/bundle.js gs://$(bucket_name)/apps/explore-blending/$(version)/bundle.js
