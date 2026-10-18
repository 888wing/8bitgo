# 評議室：黑板、牆上的鐘、四個動作、不記名投票。由文字原型（prototype/main.js）的評議室搬過來。
# greybox：黑板是一張表，每一格是主席用粉筆寫的「信」「疑」；有人改了主意，那一格會亮一下。
extends Node2D

signal acted(act: Dictionary)

const Pal := preload("res://scripts/pixel/palette.gd")
const Draw := preload("res://scripts/pixel/draw.gd")
const Text := preload("res://scripts/pixel/pixel_text.gd")
const Rules := preload("res://scripts/rules/rules.gd")
const CaseData := preload("res://scripts/rules/case_data.gd")
const Speakers := preload("res://scripts/ui/speakers.gd")
const TalkScript := preload("res://scripts/ui/talk.gd")
const MenuScript := preload("res://scripts/ui/menu.gd")

const BOARD := Rect2i(4, 4, 326, 186)
const LABEL_X := 10
const SEAT_X := 142
const SEAT_W := 26
const ROW_Y := 24
const ROW_H := 12
const ACTIONS := ["present", "ask", "callout", "vote"]
const ACTION_X := 338
const ACTION_Y := 52
const ACTION_W := 136
const ACTION_H := 17

var sound: Node
var ui: Dictionary
var C: Dictionary
var trial: Dictionary
var day := 1
var talk: Node2D
var menu: Node2D
var choosing := false
var picking := false
var reading_tally: Variant = null # 唱票時的票數
var buttons := {} # 動作 → 位置
var _last := {} # 上一次畫黑板時每一格的記號：改了的格會亮一下
var _bg: Sprite2D


func _ready() -> void:
	ui = JSON.parse_string(FileAccess.get_file_as_string("res://data/ui.json"))
	C = CaseData.data()
	_bg = Sprite2D.new()
	_bg.centered = false
	add_child(_bg)
	talk = TalkScript.new()
	talk.sound = sound
	add_child(talk)
	menu = MenuScript.new()
	menu.sound = sound
	add_child(menu)


# 一節評議：開場、你的動作、投票。最後一天沒有五票，就延長評議（最多兩節）。回傳最後一次表決的結果。
func deliberate(t: Dictionary, d: int) -> Dictionary:
	trial = t
	day = d
	_last = {}
	reading_tally = null
	draw()
	await play_events(Rules.start_room(trial))
	while true:
		while not trial.room.over:
			var act: Dictionary = await choose_action()
			var events: Array
			match act.kind:
				"present":
					events = Rules.present(trial, act.card, act.target)
				"ask":
					events = Rules.ask(trial, act.target)
				"callout":
					events = Rules.call_out(trial, act.statement)
				_:
					events = Rules.call_vote(trial)
			await play_events(events)
		var choice: String = await ballot()
		var result: Dictionary = Rules.vote(trial, choice)
		await reading(result)
		if result.verdict != null or not trial.ext.final or int(trial.ext.session) >= 2:
			return result
		await play_events(Rules.start_extension(trial))
	return {}


func play_events(events: Array) -> void:
	for e in events:
		if e.type == "line":
			draw()
			await talk.say(e)
		draw()
	_last = _snapshot()
	draw()


func choose_action() -> Dictionary:
	choosing = true
	draw()
	var act: Dictionary = await acted
	choosing = false
	draw()
	return act


func enabled(kind: String) -> bool:
	match kind:
		"present":
			return not Rules.cards(trial).is_empty()
		"callout":
			return not statements().is_empty()
	return true


func statements() -> Array:
	return trial.room.statements.filter(func(s: Dictionary) -> bool: return s.active and not String(s.id).begins_with("ask-"))


# 按了一個動作：再揀證物、揀人或揀一句話。中途取消就甚麼都不做。
func pick(kind: String) -> void:
	picking = true
	var r: Dictionary = ui.room
	match kind:
		"present":
			var cards: Array = Rules.cards(trial)
			var options := cards.map(func(c: Dictionary) -> Dictionary:
				return {"text": c.name, "note": "；".join(c.reasons.map(func(id: String) -> String: return C.REASONS[id].note))})
			var i: int = await menu.ask(r.pickCard, options, r.cancel, 340)
			if i >= 0:
				var target: Variant = await pick_juror(r.pickJuror.replace("{card}", cards[i].name))
				if target != null:
					acted.emit({"kind": "present", "card": cards[i].card, "target": target})
		"ask":
			var target: Variant = await pick_juror(r.askWho)
			if target != null:
				acted.emit({"kind": "ask", "target": target})
		"callout":
			var list := statements()
			var i: int = await menu.ask(r.pickStatement, list.map(func(s: Dictionary) -> Dictionary:
				return {"text": "%s：「%s」" % [Speakers.display(s.juror), s.text]}), r.cancel, 360)
			if i >= 0:
				acted.emit({"kind": "callout", "statement": list[i].id})
		"vote":
			var i: int = await menu.ask(r.confirmVote, [{"text": r.confirm}], r.cancel)
			if i == 0:
				acted.emit({"kind": "vote"})
	picking = false


func pick_juror(heading: String) -> Variant:
	var ids: Array = Rules.active_jurors(trial)
	var seats := {}
	for s in C.SEATS:
		seats[s.id] = s
	var i: int = await menu.ask(heading, ids.map(func(id: String) -> Dictionary:
		return {"text": "%d號　%s" % [int(seats[id].seat), seats[id].call], "note": seats[id].role}), ui.room.cancel)
	return ids[i] if i >= 0 else null


func ballot() -> String:
	var r: Dictionary = ui.room
	var kinds := ["G", "NG"]
	if trial.ext.final:
		if Rules.alt_available(trial):
			kinds.append("A")
	else:
		kinds.append("U")
	await talk.say({"who": "leung", "text": r.slipLine})
	var heading: String = r.ballotFinal if trial.ext.final else r.ballot
	var i: int = await menu.ask(heading, kinds.map(func(k: String) -> Dictionary: return {"text": r.votes[k]}))
	return kinds[i]


const TALLY := ["", "一", "丅", "下", "止"]


static func tally_marks(n: int) -> String:
	return "正".repeat(n / 5) + TALLY[n % 5]


func reading(result: Dictionary) -> void:
	reading_tally = {}
	for k in result.tally:
		reading_tally[k] = 0
	draw()
	talk.speak({"who": "旁白", "text": ui.room.reading})
	for b in result.ballots:
		await _wait(0.6)
		reading_tally[b.vote] = int(reading_tally.get(b.vote, 0)) + 1
		sound.pen()
		draw()
	await _wait(0.6)
	var v: Variant = result.verdict
	var key: String = v if v != null else ("noneFinal" if trial.ext.final else "none")
	await talk.say({"who": "leung", "text": ui.room.result[key]})
	reading_tally = null
	draw()


func _wait(seconds: float) -> void:
	var tw := create_tween()
	tw.tween_interval(seconds)
	await tw.finished


# —— 黑板 ——

func _snapshot() -> Dictionary:
	var out := {}
	if trial.room == null:
		return out
	for id in trial.room.board:
		for s in C.SEATS:
			out["%s:%s" % [s.id, id]] = Rules.board_cell(trial, s.id, id)
	return out


func draw() -> void:
	var img := Draw.canvas(480, 270)
	img.fill(Pal.WALL)
	Draw.rect(img, 0, 190, 480, 80, Pal.WOOD_DARK)
	Draw.rect(img, BOARD.position.x, BOARD.position.y, BOARD.size.x, BOARD.size.y, Pal.PANEL)
	Draw.frame(img, BOARD.position.x, BOARD.position.y, BOARD.size.x, BOARD.size.y, Pal.WOOD)
	var marks: Dictionary = ui.room.marks
	var dismissed: Dictionary = trial.get("ext", {}).get("dismissed", {})
	Draw.blit(img, Text.render(ui.room.board, "body", Pal.WALL_LIGHT, 0, 14).image, LABEL_X, 7)
	for i in C.SEATS.size():
		var s: Dictionary = C.SEATS[i]
		var x: int = SEAT_X + i * SEAT_W
		if s.id == "you":
			Draw.dither(img, x - 2, 6, SEAT_W, BOARD.size.y - 4, Pal.WALL_DARK)
		var color: Color = Pal.GREY if dismissed.has(s.id) else Pal.PAPER
		Draw.blit(img, Text.render(s.short, "body", color, 0, 14).image, x + 6, 7)
		if dismissed.has(s.id):
			Draw.rect(img, x + 2, 14, 18, 1, Pal.PAPER)
	if trial.room != null:
		var now := _snapshot()
		var y := ROW_Y
		for id in trial.room.board:
			Draw.dotted_line(img, LABEL_X, y - 2, BOARD.size.x - 10, Pal.WALL_DARK)
			Draw.blit(img, Text.render(C.CLAIMS[id].label, "body", Pal.PAPER, 0, ROW_H).image, LABEL_X, y)
			for i in C.SEATS.size():
				var s: Dictionary = C.SEATS[i]
				if dismissed.has(s.id):
					continue
				var key := "%s:%s" % [s.id, id]
				var cell: String = now.get(key, "hidden")
				var changed: bool = _last.has(key) and _last[key] != cell
				var x: int = SEAT_X + i * SEAT_W
				if changed:
					Draw.rect(img, x + 2, y - 1, 20, ROW_H, Pal.BRASS_DARK)
				var color: Color = Pal.RED if cell == "struck" else (Pal.PAPER if cell in ["trust", "doubt"] else Pal.WALL)
				Draw.blit(img, Text.render(marks[cell], "body", color, 0, ROW_H).image, x + 6, y)
			y += ROW_H
	# 右邊：地點、鐘、動作
	var place: String = ui.places.room.replace("{n}", ui.numbers[day - 1])
	Draw.blit(img, Text.render(place, "name", Pal.INK, 0, 14).image, ACTION_X, 8)
	if trial.room != null:
		var clock := Rules.clock_label(trial)
		if int(trial.ext.get("session", 0)) > 0:
			clock = ui.room.extension.replace("{n}", ui.numbers[int(trial.ext.session) - 1])
		Draw.rect(img, ACTION_X, 26, ACTION_W, 17, Pal.PAPER)
		Draw.frame(img, ACTION_X, 26, ACTION_W, 17, Pal.WOOD)
		Draw.blit(img, Text.render(clock, "body", Pal.INK, 0, 15).image, ACTION_X + 6, 27)
	buttons = {}
	for i in ACTIONS.size():
		var kind: String = ACTIONS[i]
		var r := Rect2i(ACTION_X, ACTION_Y + i * (ACTION_H + 5), ACTION_W, ACTION_H)
		buttons[kind] = r
		var on: bool = choosing and trial.room != null and not trial.room.over and enabled(kind)
		Draw.rect(img, r.position.x, r.position.y, r.size.x, r.size.y, Pal.BRASS if on else Pal.WALL_DARK)
		Draw.frame(img, r.position.x, r.position.y, r.size.x, r.size.y, Pal.BRASS_DARK if on else Pal.PANEL)
		if on:
			Draw.rect(img, r.position.x + 1, r.position.y + 1, r.size.x - 2, 1, Pal.BRASS_LIGHT)
		Draw.blit(img, Text.render(ui.room.actions[kind], "bold", Pal.INK if on else Pal.WALL, 0, 15).image, r.position.x + 8, r.position.y + 1)
	if reading_tally != null:
		var px := 60
		var py := 50
		Draw.dither(img, px + 3, py + 3, 210, 90, Pal.BLACK)
		Draw.rect(img, px, py, 210, 90, Pal.PAPER)
		Draw.frame(img, px, py, 210, 90, Pal.PAPER_SHADE)
		Draw.blit(img, Text.render(ui.room.readingTitle, "bold", Pal.INK, 0, 15).image, px + 10, py + 6)
		var ry := py + 26
		for k in reading_tally:
			Draw.blit(img, Text.render("%s　%s" % [ui.room.votes[k], tally_marks(int(reading_tally[k]))], "body", Pal.INK, 0, 15).image, px + 14, ry)
			ry += 17
	_bg.texture = ImageTexture.create_from_image(img)


func _unhandled_input(event: InputEvent) -> void:
	if not visible or menu.visible:
		return
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		var p := Vector2i(event.position.floor())
		if choosing and not picking:
			for kind in buttons:
				if buttons[kind].has_point(p) and enabled(kind):
					sound.clack()
					pick(kind)
					get_viewport().set_input_as_handled()
					return
		talk.advance()
		get_viewport().set_input_as_handled()
	elif event is InputEventKey and event.pressed and not event.echo:
		if event.keycode in [KEY_SPACE, KEY_ENTER, KEY_KP_ENTER, KEY_RIGHT]:
			talk.advance()
			get_viewport().set_input_as_handled()


func state() -> Dictionary:
	var r := func(rect: Rect2i) -> Array: return [rect.position.x, rect.position.y, rect.size.x, rect.size.y]
	var b := {}
	for kind in buttons:
		b[kind] = {"rect": r.call(buttons[kind]), "enabled": choosing and not picking and enabled(kind)}
	return {
		"day": day, "choosing": choosing and not picking, "buttons": b, "typing": talk.typing != null, "waiting": talk.waiting,
		"menu": menu.state() if menu.visible else null, "reading": reading_tally,
		"board": trial.room.board if trial.get("room") != null else [],
		"actions": trial.room.actions if trial.get("room") != null else 0,
	}
