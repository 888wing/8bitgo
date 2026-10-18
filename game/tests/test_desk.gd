# 桌面場景的無頭測試：直接呼叫場景的方法，不經滑鼠。真正的輸入由 tools/check.js 在瀏覽器裡試。
extends "res://tests/suite.gd"

const DeskScene := preload("res://scenes/desk.tscn")


func _frames(desk: Node, n: int) -> void:
	for i in n:
		await tree.process_frame


# 一直按「下一句」，直到 until 成立或者按了 limit 次。
func _advance_until(desk: Node, until: Callable, limit := 200) -> void:
	for i in limit:
		if until.call():
			return
		desk.advance()
		await tree.process_frame
		await tree.process_frame


func test_first_witness_fills_notebook() -> void:
	about("桌面：鄭督察的三句說法寫進筆記本，三件證物送到托盤")
	var desk: Node2D = DeskScene.instantiate()
	tree.root.add_child(desk)
	await _frames(desk, 2)
	desk.close_modal()
	await _advance_until(desk, func() -> bool: return desk.trial.heard.size() >= 3 and desk.docs.size() >= 3)
	await _frames(desk, 120)
	eq(desk.trial.heard, ["c1", "c2", "c3"], "聽到的說法")
	eq(desk.docs.map(func(d: Dictionary) -> String: return d.id), ["P1", "P2", "P4"], "托盤上的證物")
	eq(desk.entry_rects.size(), 3, "筆記本上的說法")
	desk.queue_free()
