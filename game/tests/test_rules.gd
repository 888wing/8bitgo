# 規則引擎的測試：prototype/test/engine.test.js 逐條移植，說明和斷言都一樣。
extends "res://tests/suite.gd"

const Rules := preload("res://scripts/rules/rules.gd")
const CaseData := preload("res://scripts/rules/case_data.gd")


# 照劇本把某一天的證人全部聽完，像玩家在法庭上一樣。
func _hear_day(game: Dictionary, day: int) -> void:
	game.day = day
	var days: Array = CaseData.table("DAYS")
	var witnesses: Dictionary = CaseData.table("WITNESSES")
	for wid in days[day - 1]["witnesses"]:
		for beat in witnesses[wid]["script"]:
			if beat.has("claim"):
				Rules.hear_claim(game, beat["claim"])
			if beat.has("exhibit"):
				Rules.add_exhibit(game, beat["exhibit"])
			if beat.has("strike"):
				Rules.strike_claim(game, beat["strike"])
				Rules.set_player_stamp(game, beat["strike"], "struck")


func _stamp_all(game: Dictionary, value: Variant, ids: Array) -> void:
	for id in ids:
		Rules.set_player_stamp(game, id, value)


func _ai_votes(game: Dictionary) -> Dictionary:
	var out := {}
	for id in ["leung", "wong", "law", "lam", "so", "fung"]:
		out[id] = Rules.ai_vote(game, id)
	return out


func _has_flip(events: Array, juror: String, claim: Variant = null, to: Variant = null) -> bool:
	for e in events:
		if e.get("type") != "flip" or e.get("juror") != juror:
			continue
		if claim != null and e.get("claim") != claim:
			continue
		if to != null and e.get("to") != to:
			continue
		return true
	return false


func test_day1_five_guilty() -> void:
	about("第一天：四人傾向有罪，你就是第五票")
	var game := Rules.create_game({"seed": 7})
	_hear_day(game, 1)
	Rules.start_room(game)
	eq(_ai_votes(game), {"leung": "G", "wong": "G", "law": "G", "lam": "NG", "so": "G", "fung": "U"})
	game.room.over = true
	var result := Rules.vote(game, "G")
	eq(result.tally.G, 5)
	eq(result.verdict, "G")


func test_day1_undecided() -> void:
	about("第一天：投未決，審判就有第二天")
	var game := Rules.create_game({"seed": 7})
	_hear_day(game, 1)
	Rules.start_room(game)
	var result := Rules.vote(game, "U")
	eq(result.verdict, null)


func test_confession_handwriting() -> void:
	about("口供頁底的手寫字令主席收回對口供的信任")
	var game := Rules.create_game()
	_hear_day(game, 1)
	Rules.zoom(game, "P4")
	eq(Rules.cross_check(game, "c3", "P4b").kind, "reason")
	Rules.start_room(game)
	var events := Rules.present(game, "P4", "leung")
	check(_has_flip(events, "leung", "c3", "doubt"))
	eq(Rules.ai_vote(game, "leung"), "U")


func test_dry_lighter() -> void:
	about("乾掉的打火機說不動黃老闆，但馮 Sir 會湊過來看")
	var game := Rules.create_game()
	_hear_day(game, 1)
	Rules.zoom(game, "P2")
	Rules.cross_check(game, "c2", "P2b")
	Rules.start_room(game)
	var events := Rules.present(game, "P2", "wong")
	check(not _has_flip(events, "wong"))
	eq(game.jurors.fung.stamps.c2, "doubt")
	eq(Rules.ai_vote(game, "fung"), "NG")
	eq(Rules.ai_vote(game, "wong"), "G")


func test_ask_fung_burn_marks() -> void:
	about("追問馮 Sir 得到燒痕的理由，專家的話說得動主席")
	var game := Rules.create_game()
	_hear_day(game, 1)
	Rules.start_room(game)
	Rules.ask(game, "fung")
	check(game.player.reasons.has("RB"))
	Rules.present(game, "P1", "leung")
	eq(game.jurors.leung.stamps.c1, "doubt")
	eq(Rules.ai_vote(game, "leung"), "U")


func test_thought_only() -> void:
	about("看不懂的對照只留下一個念頭")
	var game := Rules.create_game()
	_hear_day(game, 1)
	Rules.zoom(game, "P1")
	eq(Rules.cross_check(game, "c1", "P1b").kind, "thought")
	eq(Rules.cross_check(game, "g1", "P2a").kind, "none")


func test_three_actions() -> void:
	about("三個動作之後，庭警敲門")
	var game := Rules.create_game()
	_hear_day(game, 1)
	Rules.start_room(game)
	Rules.ask(game, "leung")
	Rules.ask(game, "wong")
	eq(game.room.over, false)
	Rules.ask(game, "lam")
	eq(game.room.over, true)
	eq(Rules.clock_label(game), "下午四時半")


func test_day2_motive_and_kerosene() -> void:
	about("第二天：新的動機和火水單據把主席拉回有罪")
	var game := Rules.create_game()
	_hear_day(game, 1)
	Rules.zoom(game, "P4")
	Rules.cross_check(game, "c3", "P4b")
	Rules.start_room(game)
	Rules.present(game, "P4", "leung")
	eq(Rules.ai_vote(game, "leung"), "U")
	game.room.over = true
	Rules.vote(game, "U")
	_hear_day(game, 2)
	Rules.start_room(game)
	eq(Rules.ai_vote(game, "leung"), "G")


func test_day2_full() -> void:
	about("截電通知、羅生的失言、指出違規：完整的第二天")
	var game := Rules.create_game({"seed": 3})
	_hear_day(game, 1)
	_stamp_all(game, "trust", ["c1", "c2", "c3"])
	Rules.start_room(game)
	game.room.over = true
	Rules.vote(game, "U")

	_hear_day(game, 2)
	_stamp_all(game, "doubt", ["g1", "g2", "g3"])
	Rules.cross_check(game, "g2", "D1b")
	Rules.cross_check(game, "g3", "D1b")
	Rules.start_room(game)
	eq(Rules.ai_vote(game, "leung"), "G")

	# 一、截電通知推到主席面前：看更說了兩次謊，他連「見到被告」也不再信。
	Rules.present(game, "D1", "leung")
	eq(game.jurors.leung.stamps.g1, "doubt")
	# 羅生隨即替看更說話，主席又被拉回去。
	check(game.room.fired.get("d2-slip", false))
	eq(Rules.ai_vote(game, "leung"), "G")

	# 二、指出羅生的話是庭外資料。
	Rules.call_out(game, "d2-slip")
	eq(Rules.ai_vote(game, "leung"), "NG")

	# 三、截電通知推到林小姐面前，蘇太見到四個人都存疑，跟著改。
	Rules.present(game, "D1", "lam")
	eq(game.jurors.so.stamps.g3, "doubt")
	eq(_ai_votes(game), {"leung": "NG", "wong": "G", "law": "G", "lam": "NG", "so": "NG", "fung": "NG"})
	eq(game.room.over, true)

	var result := Rules.vote(game, "NG")
	eq(result.verdict, "NG")


func test_ignore_slip() -> void:
	about("不理會羅生的失言，第二天你的票又成了第五票")
	var game := Rules.create_game()
	_hear_day(game, 1)
	Rules.start_room(game)
	game.room.over = true
	Rules.vote(game, "U")
	_hear_day(game, 2)
	Rules.cross_check(game, "g2", "D1b")
	Rules.cross_check(game, "g3", "D1b")
	Rules.start_room(game)
	Rules.present(game, "D1", "leung")
	Rules.ask(game, "law")
	Rules.ask(game, "so")
	var votes := _ai_votes(game)
	var guilty := 0
	for v in votes.values():
		if v == "G":
			guilty += 1
	eq(guilty, 4)
	eq(Rules.vote(game, "G").verdict, "G")


func test_call_out_struck_hearsay() -> void:
	about("指出蘇太引用被剔除的傳聞")
	var game := Rules.create_game()
	_hear_day(game, 1)
	_hear_day(game, 2)
	Rules.start_room(game)
	eq(Rules.effective(game, "leung", "h1"), "trust")
	Rules.call_out(game, "d2-so")
	eq(Rules.effective(game, "leung", "h1"), null)


func test_wrong_call_out_costs_action() -> void:
	about("指錯了也會用掉一次發言")
	var game := Rules.create_game()
	_hear_day(game, 1)
	Rules.start_room(game)
	var events := Rules.call_out(game, "d1-wong")
	var found := false
	for e in events:
		if e.get("type") == "line" and str(e.get("text")).contains("冇問題"):
			found = true
	check(found)
	eq(game.room.actions, 2)


func test_reveal_detail() -> void:
	about("放大鏡逐處發現細節，發現之後才可以拿來對照")
	var game := Rules.create_game()
	_hear_day(game, 1)
	var seen_before := false
	for d in Rules.visible_details(game, "P4"):
		if d["id"] == "P4b":
			seen_before = true
	check(not seen_before)
	eq(Rules.reveal_detail(game, "P4b"), true)
	eq(Rules.reveal_detail(game, "P4b"), false)
	eq(Rules.reveal_detail(game, "P4a"), false)
	var seen_after := false
	for d in Rules.visible_details(game, "P4"):
		if d["id"] == "P4b":
			seen_after = true
	check(seen_after)
	eq(Rules.can_zoom(game, "P4"), false)
	eq(Rules.cross_check(game, "c3", "P4b").kind, "reason")


func test_stamp_history() -> void:
	about("改印章會留下舊的印章")
	var game := Rules.create_game()
	_hear_day(game, 1)
	Rules.set_player_stamp(game, "g2", "trust")
	Rules.set_player_stamp(game, "g2", "doubt")
	eq(Rules.stamp_history(game, "g2"), ["trust"])


func test_conscience() -> void:
	about("信與投：不信看更卻投有罪，會被記住")
	var game := Rules.create_game()
	_hear_day(game, 1)
	_stamp_all(game, "trust", ["c1", "c2", "c3", "g2"])
	_stamp_all(game, "doubt", ["g1", "g3"])
	Rules.start_room(game)
	Rules.vote(game, "G")
	var day1: Dictionary = Rules.conscience(game)[0]
	eq(day1.belief, "NG")
	eq(day1.mismatch, true)


func test_same_seed_same_order() -> void:
	about("同一個種子，投票的揭曉次序一樣")
	var runs := []
	for _i in 2:
		var game := Rules.create_game({"seed": 42})
		_hear_day(game, 1)
		Rules.start_room(game)
		var who := PackedStringArray()
		for b in Rules.vote(game, "U").ballots:
			who.append(b["who"])
		runs.append(",".join(who))
	eq(runs[0], runs[1])
