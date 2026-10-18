extends "res://tests/suite.gd"


func test_same() -> void:
	about("測試工具：JSON 的浮點數和整數當作相等")
	eq(1.0, 1)
	eq({"a": [1, "x"]}, {"a": [1.0, "x"]})
	check(not same([1], [2]))
