.PHONY: run ui clean train

run:
	cd web && python3 server.py

ui:
	cd web && python3 -m http.server 8080

train:
	python3 pyth/train_priority_model.py

clean:
	rm -f web/process_table.json web/run_stats.json process_data.csv pyth/priority_model.pkl
