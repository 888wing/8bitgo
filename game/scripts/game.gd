# 一局：標題 → 序幕 → 第一至五天（早晨、視察現場、法庭、評議室、夜晚）→ 裁決和尾聲 → 回顧。
# 流程照 docs/02-flow.md；規則全部交給 rules.gd。畫面分成幾頁，同一時間只顯示一頁：
# 桌面（desk）、故事頁（story）、評議室（room）、視察現場（site）、回顧（ending）。
extends Node2D

signal restart_requested
signal cursor_changed(shape: int)

const Rules := preload("res://scripts/rules/rules.gd")
const CaseData := preload("res://scripts/rules/case_data.gd")
const DeskScene := preload("res://scenes/desk.tscn")
const StoryScript := preload("res://scripts/screens/story.gd")
const RoomScript := preload("res://scripts/screens/room.gd")
const SiteScript := preload("res://scripts/screens/site.gd")
const EndingScript := preload("res://scripts/screens/ending.gd")

var sound: Node
var reduced := false
var seed := -1 # 自動試玩可以指定，令投票的揭曉次序固定
var C: Dictionary
var ui: Dictionary
var trial: Dictionary
var screen := ""
var day := 0
var desk: Node2D
var story: Node2D
var room: Node2D
var site: Node2D
var ending: Node2D


func _ready() -> void:
	C = CaseData.data()
	ui = JSON.parse_string(FileAccess.get_file_as_string("res://data/ui.json"))
	trial = Rules.create_game({"seed": seed if seed >= 0 else randi() & 0x7fffffff})
	desk = DeskScene.instantiate()
	desk.sound = sound
	desk.reduced = reduced
	desk.trial = trial
	desk.cursor_changed.connect(func(shape: int) -> void: cursor_changed.emit(shape))
	add_child(desk)
	story = _screen(StoryScript)
	room = _screen(RoomScript)
	site = _screen(SiteScript)
	ending = _screen(EndingScript)
	run()


func _screen(script: GDScript) -> Node2D:
	var node: Node2D = script.new()
	node.sound = sound
	node.visible = false
	add_child(node)
	return node


func show_only(name: String) -> void:
	screen = name
	for n in {"desk": desk, "story": story, "room": room, "site": site, "ending": ending}:
		var node: Node2D = {"desk": desk, "story": story, "room": room, "site": site, "ending": ending}[n]
		node.visible = n == name
	cursor_changed.emit(Input.CURSOR_ARROW)


func place(key: String, d: int) -> String:
	return String(ui.places[key]).replace("{n}", ui.numbers[d - 1])


func run() -> void:
	show_only("story")
	await story.title()
	story.show_place("court", ui.places.prologue)
	await story.play(C.PROLOGUE)
	for d in range(1, 6):
		day = d
		Rules.start_day(trial, d)
		if d > 1:
			show_only("story")
			story.show_place("morning", place("morning", d))
			await story.play(Rules.morning_beats(trial, d))
			if trial.ext.out == "dismissed":
				await finish(null, d)
				return
		var def: Dictionary = C.DAYS[d - 1]
		if def.get("site", false):
			show_only("site")
			await site.visit(trial)
		show_only("desk")
		if def.get("site", false):
			Rules.add_exhibit(trial, "V1")
			desk.deliver("V1")
		await desk.play_day(d)
		show_only("room")
		var result: Dictionary = await room.deliberate(trial, d)
		if result.verdict != null or trial.ext.final:
			await finish(result.verdict, d)
			return
		await night(d)
		if trial.ext.out in ["bangle", "mistrial"]:
			await finish(null, d)
			return


func night(d: int) -> void:
	show_only("story")
	story.show_place("night", place("night", d))
	await story.play(C.NIGHT.get(str(d), []))
	var ev: Dictionary = Rules.night_event(trial, d)
	if ev.is_empty():
		return
	await story.play(ev.intro)
	var i: int = await story.choose(ev.prompt, ev.options)
	var res: Dictionary = Rules.choose_night(trial, d, ev.options[i].id)
	await story.play(res.beats)


# 裁決和尾聲，然後回顧。被解除職務時，你在法庭外的長椅上聽不到裁決。
func finish(verdict: Variant, d: int) -> void:
	var end: Dictionary = Rules.ending_of(trial, verdict, d)
	show_only("story")
	var where := "bench" if trial.ext.out in ["dismissed", "bangle"] else ("night" if trial.ext.out == "mistrial" else "court")
	story.show_place(where, ui.places.verdict if where == "court" else "")
	await story.play(end.beats)
	show_only("ending")
	ending.show_debrief(trial, end, verdict, d)
	await ending.again
	restart_requested.emit()


# —— 自動試玩讀的狀態 ——

func state() -> Dictionary:
	var s := {"screen": screen, "day": day, "trial": trial}
	match screen:
		"desk":
			s.merge(desk.state())
		"story":
			s.story = story.state()
		"room":
			s.room = room.state()
		"site":
			s.site = site.state()
		"ending":
			s.ending = ending.state()
	return s
