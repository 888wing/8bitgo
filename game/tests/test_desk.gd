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
	desk.play_day(1)
	await _advance_until(desk, func() -> bool: return desk.trial.heard.size() >= 3 and desk.docs.size() >= 3)
	await _frames(desk, 120)
	eq(desk.trial.heard, ["c1", "c2", "c3"], "聽到的說法")
	eq(desk.docs.map(func(d: Dictionary) -> String: return d.id), ["P1", "P2", "P4"], "托盤上的證物")
	eq(desk.entry_rects.size(), 3, "筆記本上的說法")
	desk.queue_free()


# 故事頁、評議室的對白框畫出來的圖：按一下跳過打字的，跟等它打完的，要逐點相同。
func _typed_image(talk: Node, beat: Dictionary, skip: bool) -> PackedByteArray:
	talk.speak(beat)
	await tree.process_frame
	if skip:
		talk.advance()
	for i in 600:
		if talk.typing == null:
			break
		await tree.process_frame
	await tree.process_frame
	return talk._sprite.texture.get_image().get_data()


func test_skip_typing_draws_whole_line() -> void:
	about("對白框：打字途中按一下，即刻顯示整句，不會停在打到一半")
	var beat := {"who": "鄭督察", "text": "凌晨兩點十分，消防接報。火好快就燒到四樓。"}
	var talk: Node2D = preload("res://scripts/ui/talk.gd").new()
	tree.root.add_child(talk)
	await tree.process_frame
	var skipped := await _typed_image(talk, beat, true)
	var full := await _typed_image(talk, beat, false)
	check(skipped == full, "故事頁、評議室的對白框")
	talk.queue_free()
	# 桌面的圖用 update 換內容，無頭模式讀不回來，所以看它記下的字
	var desk: Node2D = DeskScene.instantiate()
	tree.root.add_child(desk)
	await _frames(desk, 2)
	desk.speak(beat)
	await tree.process_frame
	desk.advance()
	await _frames(desk, 3)
	eq(desk.typing, null, "打完")
	eq(desk.dialogue_text, beat.text, "法庭桌面的對白框")
	desk.queue_free()
