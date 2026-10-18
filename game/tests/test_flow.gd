# 整局的冒煙測試：不經滑鼠，直接按各頁的方法玩一局，看每一頁都走得通、走到結局。
# 真正的滑鼠和觸控由 tools/check.js 在瀏覽器裡試。
extends "res://tests/suite.gd"

const GameScript := preload("res://scripts/game.gd")
const SoundScript := preload("res://scripts/desk/sound.gd")
const Rules := preload("res://scripts/rules/rules.gd")


# policy：ballot(game) 回傳選票的次序；night(game, n) 回傳夜晚選項的 id；stamp(game) 在證人退庭前蓋章。
func play(policy: Dictionary, seed := 7, limit_s := 900.0) -> Dictionary:
	var sound: Node = SoundScript.new()
	sound.muted = true
	tree.root.add_child(sound)
	var game: Node2D = GameScript.new()
	game.sound = sound
	game.seed = seed
	var restarted := [false]
	game.restart_requested.connect(func() -> void: restarted[0] = true)
	tree.root.add_child(game)
	var t := 0.0
	var seen := {}
	var ending := ""
	while t < limit_s and not restarted[0]:
		await tree.process_frame
		t += 1.0 / 60.0
		seen[game.screen] = true
		_step(game, policy)
		seen[game.screen] = true
		if game.screen == "ending" and ending == "":
			ending = game.ending.title
			game.ending.again.emit()
	var out := {"ending": ending, "seen": seen, "day": game.day, "trial": game.trial.duplicate(true), "restarted": restarted[0]}
	game.queue_free()
	sound.queue_free()
	await tree.process_frame
	return out


func _step(game: Node2D, policy: Dictionary) -> void:
	match game.screen:
		"story":
			var s: Node2D = game.story
			if s.card != null:
				s.opened.emit()
			elif s.menu.visible:
				var id: String = policy.night.call(game, game.day)
				s.menu.picked.emit(policy.night_index.call(game, game.day, id))
			else:
				s.talk.advance()
		"site":
			var site: Node2D = game.site
			if site.looking:
				for id in site.SPOTS:
					if not game.trial.zoomed.get(id, false):
						site.look(id)
						return
				site.left.emit()
			else:
				site.talk.advance()
		"desk":
			var d: Node2D = game.desk
			if d.modal != null:
				d.close_modal()
			elif d.stamping != null and d.rack_ready and not d.slip_busy and d.drag == null:
				if d.stamping.mode == "strike":
					d.stamp_claim(d.stamping.claim, "struck")
					d.struck_pending = false
					d.struck_done.emit()
				else:
					policy.stamp.call(game)
					d.leave()
			else:
				d.advance()
		"room":
			var r: Node2D = game.room
			if r.menu.visible:
				r.menu.picked.emit(policy.ballot.call(game))
			elif r.choosing and not r.picking:
				r.acted.emit({"kind": "vote"})
			else:
				r.talk.advance()


# 夜晚：揀 id 那一個選項；沒有就揀第一個。
func _night_index(game: Node2D, n: int, id: String) -> int:
	var ev: Dictionary = Rules.night_event(game.trial, n)
	for i in ev.options.size():
		if ev.options[i].id == id:
			return i
	return 0


func _policy(ballot: Callable, nights := {}) -> Dictionary:
	return {
		"ballot": ballot,
		"night": func(game: Node2D, n: int) -> String: return nights.get(n, "silent"),
		"night_index": func(game: Node2D, n: int, id: String) -> int: return _night_index(game, n, id),
		"stamp": func(game: Node2D) -> void: pass,
	}


func test_one_day() -> void:
	about("整局：第一天投有罪，一日審判，回到開場")
	var out := await play(_policy(func(game: Node2D) -> int: return 0))
	eq(out.ending, "一日審判", "結局")
	check(out.restarted, "回顧頁按再玩一次就重新開局")
	for s in ["story", "desk", "room", "ending"]:
		check(out.seen.has(s), "沒有經過 %s" % s)


func test_five_days() -> void:
	about("整局：每天投未決（最後一天投無罪），走完五天、視察現場、四個夜晚")
	var ballot := func(game: Node2D) -> int:
		return 1 if game.trial.ext.final else 2
	var out := await play(_policy(ballot, {1: "fair", 2: "silent", 3: "refuse", 4: "refuse"}))
	check(out.ending != "", "沒有走到結局")
	eq(out.day, 5, "最後一天")
	check(out.seen.has("site"), "沒有視察現場")
	check(out.trial.struck.get("c3", false), "第三天沒有剔除口供")
	eq(out.trial.player.stamps.get("c3"), "struck", "口供那一行蓋了不予採納")


func test_press_dismissed() -> void:
	about("整局：第二晚向記者說出評議室的事，第三天早上被解除職務")
	var ballot := func(game: Node2D) -> int: return 2
	var out := await play(_policy(ballot, {1: "fair", 2: "tell"}))
	eq(out.ending, "被解除職務", "結局")
	eq(out.day, 3, "第三天早上")
