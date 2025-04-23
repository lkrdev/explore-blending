.PHONY: cdn

cdn:
	gcloud storage cp dist/bundle.js gs://$(bucket_name)/apps/explore-blending/$(version)/bundle.js
