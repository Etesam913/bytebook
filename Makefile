unit-tests:
	go test ./lib/./...

e2e-tests:
	cd frontend/ && bash test_script.sh
