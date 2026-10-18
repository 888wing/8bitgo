# 結局之後的一頁：你每天投了甚麼、筆記本推得出甚麼、改過幾次印章；提早結束的話，還有排期表上不會出庭的證人。
# 由文字原型（prototype/main.js）的 debrief 搬過來。按「再玩一次」重新開始。
extends Node2D

signal again

const Pal := preload("res://scripts/pixel/palette.gd")
const Draw := preload("res://scripts/pixel/draw.gd")
const Text := preload("res://scripts/pixel/pixel_text.gd")
const Rules := preload("res://scripts/rules/rules.gd")
const CaseData := preload("res://scripts/rules/case_data.gd")

var sound: Node
var ui: Dictionary
var C: Dictionary
var button := Rect2i()
var title := ""
var _bg: Sprite2D


func _ready() -> void:
	ui = JSON.parse_string(FileAccess.get_file_as_string("res://data/ui.json"))
	C = CaseData.data()
	_bg = Sprite2D.new()
	_bg.centered = false
	add_child(_bg)


static func fill(template: String, vars: Dictionary) -> String:
	var out := template
	for k in vars:
		out = out.replace("{%s}" % k, str(vars[k]))
	return out


func show_debrief(trial: Dictionary, end: Dictionary, verdict: Variant, day: int) -> void:
	title = end.title
	var d: Dictionary = ui.debrief
	var votes_word: Dictionary = ui.room.votes
	var img := Draw.canvas(480, 270)
	img.fill(Pal.INK)
	Draw.rect(img, 8, 8, 464, 254, Pal.PANEL)
	Draw.frame(img, 8, 8, 464, 254, Pal.BRASS)
	Draw.frame(img, 9, 9, 462, 252, Pal.BLACK)
	var heading := Text.render(title, "heading", Pal.WHITE, 0, 20)
	Draw.blit(img, heading.image, 20, 14)
	# 「再玩一次」放在右上角，下面全部留給文字
	var b := Text.render(d.again, "bold", Pal.INK, 0, 15)
	var bw: int = b.width + 20
	button = Rect2i(460 - bw, 16, bw, 17)
	Draw.rect(img, button.position.x, button.position.y, bw, 17, Pal.BRASS)
	Draw.frame(img, button.position.x, button.position.y, bw, 17, Pal.BRASS_DARK)
	Draw.rect(img, button.position.x + 1, button.position.y + 1, bw - 2, 1, Pal.BRASS_LIGHT)
	Draw.blit(img, b.image, button.position.x + 10, button.position.y + 1)
	# 左欄：你的票（每天一行：那天最後一票）、你的筆記本
	var y := [42]
	var put := func(text: String, color: Color, x: int, w: int, gap := 2) -> void:
		var t := Text.render(text, "body", color, w, 14)
		Draw.blit(img, t.image, x, y[0])
		y[0] += t.height + gap
	put.call(d.votes, Pal.BRASS, 20, 210)
	var last := {}
	var sessions := {}
	for v in Rules.conscience(trial):
		last[int(v.day)] = v
		sessions[int(v.day)] = int(sessions.get(int(v.day), 0)) + 1
	var mismatch := []
	for dd in last:
		var v: Dictionary = last[dd]
		put.call(fill(d.voteLine, {"day": ui.numbers[dd - 1], "vote": votes_word[v.vote], "belief": d.beliefs[v.belief]}), Pal.WHITE, 20, 220, 1)
		if sessions[dd] > 1:
			put.call(fill(d.extended, {"day": ui.numbers[dd - 1], "n": sessions[dd] - 1}), Pal.WALL_LIGHT, 20, 220, 1)
		if v.mismatch:
			mismatch.append(fill(d.mismatch[v.vote], {"day": ui.numbers[dd - 1]}))
	if last.is_empty():
		put.call(d.noVotes, Pal.WALL_LIGHT, 20, 216)
	for m in mismatch:
		put.call(m, Pal.BRASS_LIGHT, 20, 216)
	if mismatch.is_empty() and not last.is_empty():
		put.call(d.consistent, Pal.WALL_LIGHT, 20, 216)
	y[0] += 6
	put.call(d.notebook, Pal.BRASS, 20, 210)
	var struck := 0
	for k in trial.player.stamps:
		if trial.player.stamps[k] == "struck":
			struck += 1
	var found := 0
	for r in trial.player.reasons:
		if not C.REASONS[r].has("from"):
			found += 1
	put.call(fill(d.notebookLine, {
		"changes": trial.player.history.size(), "struck": struck, "found": found,
		"borrowed": trial.player.reasons.size() - found, "slips": trial.ext.slips.size(),
	}), Pal.WHITE, 20, 216)
	# 右欄：排期表（一段）、試玩問題
	y[0] = 42
	var unheard: Array = []
	if verdict != null or trial.ext.out != null:
		for s in C.SCHEDULE:
			if int(s.day) > day:
				unheard.append_array(s.names)
	if not unheard.is_empty():
		put.call(d.schedule, Pal.BRASS, 248, 210)
		put.call("、".join(unheard), Pal.WALL_LIGHT, 248, 212)
		y[0] += 6
	put.call(d.ask, Pal.BRASS, 248, 210)
	for i in C.PLAYTEST.size():
		put.call("%d. %s" % [i + 1, C.PLAYTEST[i]], Pal.WHITE, 248, 212)
	_bg.texture = ImageTexture.create_from_image(img)


func _unhandled_input(event: InputEvent) -> void:
	if not visible:
		return
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		if button.has_point(Vector2i(event.position.floor())):
			sound.clack()
			again.emit()
		get_viewport().set_input_as_handled()
	elif event is InputEventKey and event.pressed and not event.echo and event.keycode in [KEY_ENTER, KEY_KP_ENTER]:
		again.emit()
		get_viewport().set_input_as_handled()


func state() -> Dictionary:
	return {"title": title, "again": [button.position.x, button.position.y, button.size.x, button.size.y]}
