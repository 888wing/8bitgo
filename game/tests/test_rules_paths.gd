# 規則層的試玩：一個機器人從 create_game 玩到結局，每個結局一條劇本，證明它在現有資料下走得到。
# 只用規則函數（hear_day、zoom、reveal_detail、cross_check、蓋章、紙條、start_room、present、ask、call_out、
# 表決、夜晚），畫面和對白由畫面負責。每條路最後要求 ending_of 回傳的結局 id 和天數。
# 每一步都驗證：該有裁決的日子有，不該有的日子沒有（否則審判提早結束，後面的結局就走不到）。
extends "res://tests/suite.gd"

const Rules := preload("res://scripts/rules/rules.gd")
const CaseData := preload("res://scripts/rules/case_data.gd")


# 什麼都不做的夜晚：照市價、什麼都不說、不收金鐲、不收錢（第四晚的選項另外寫）。
const NIGHT_PASS := {1: "fair", 2: "silent", 3: "refuse", 4: "refuse"}


# —— 小工具 ——

func _open(game: Dictionary, day: int) -> void:
	Rules.hear_day(game, day)
	Rules.start_room(game)


func _stamp(game: Dictionary, value: Variant, ids: Array) -> void:
	for id in ids:
		Rules.set_player_stamp(game, id, value)


# 請主席表決，你投 vote_value，並檢查有沒有裁決。
func _ballot(game: Dictionary, vote_value: String, expect: Variant = null) -> Dictionary:
	Rules.call_vote(game)
	var result := Rules.vote(game, vote_value)
	eq(result.verdict, expect, "第 %d 天你投 %s 的表決，票數 %s" % [game.day, vote_value, str(result.tally)])
	return result


# 夜晚：選項必須真的出現在畫面上，才算走得到。
func _night(game: Dictionary, night: int, option_id: String) -> Dictionary:
	var ids := []
	for o in Rules.night_event(game, night).options:
		ids.append(o.id)
	check(ids.has(option_id), "第 %d 晚的選項 %s 沒有出現：%s" % [night, option_id, str(ids)])
	return Rules.choose_night(game, night, option_id)


# 遞紙條：只能遞畫面上看得到的，答案裡的說法聽進去。
func _slip(game: Dictionary, witness: String, slip_id: String) -> void:
	var ids := []
	for s in Rules.slips_for(game, witness):
		ids.append(s.id)
	check(ids.has(slip_id), "紙條 %s 沒有出現：%s" % [slip_id, str(ids)])
	for b in Rules.use_slip(game, slip_id):
		if b.has("claim"):
			Rules.hear_claim(game, b["claim"])


func _end(game: Dictionary, result: Variant, day: int) -> Dictionary:
	var verdict: Variant = null
	if result != null:
		verdict = result.verdict
	return Rules.ending_of(game, verdict, day)


# 一條「質疑起火點」的路：第一至三天，只靠理由說服陪審員，不夜晚選擇任何一邊。
# 第一天：馮 Sir 說燒痕由下面燒上來（理由 RB），梁伯收回起火點。
func _doubt_day1(game: Dictionary) -> void:
	_open(game, 1)
	Rules.ask(game, "fung")
	Rules.present(game, "P1", "leung")
	Rules.ask(game, "lam")
	eq(game.jurors.leung.stamps.c1, "doubt", "梁伯收回 c1")
	_stamp(game, "doubt", ["c1"])
	_ballot(game, "U")
	_night(game, 1, "fair")


# 第二天：打火機的火石磨平（理由 R2）說動馮 Sir，蘇太見到大家都疑，跟著疑。
func _doubt_day2(game: Dictionary) -> void:
	_open(game, 2)
	Rules.zoom(game, "P2")
	eq(Rules.cross_check(game, "c2", "P2b").kind, "reason")
	Rules.present(game, "P2", "fung")
	Rules.call_out(game, "d2-so")
	Rules.ask(game, "so")
	eq(game.jurors.so.stamps.c1, "doubt", "蘇太跟大隊疑 c1")
	_stamp(game, "doubt", ["c1", "c2"])
	_ballot(game, "U")
	_night(game, 2, "silent")


# 第三天：法官剔除口供；羅生又失言，你指出來，他第四天被解除職務。
func _doubt_day3(game: Dictionary) -> void:
	_open(game, 3)
	Rules.ask(game, "lam")
	Rules.ask(game, "so")
	check(game.room.fired.has("d3-slip"), "羅生失言")
	Rules.call_out(game, "d3-slip")
	eq(game.ext.exposed, {"law": 3})
	_ballot(game, "U")
	_night(game, 3, "refuse")


# 第四天早上：羅生解除職務，到福安樓看過現場，放大燒痕。
func _day4_morning(game: Dictionary) -> void:
	Rules.start_day(game, 4)
	var beats := Rules.morning_beats(game, 4)
	eq(beats[0].who, "法官")
	check(str(beats[0].text).contains("羅永昌"), "法官宣布羅生被解除")
	Rules.add_exhibit(game, "V1")
	for d in ["V1a", "V1b", "V1c"]:
		Rules.reveal_detail(game, d)


# 第四天：地下寫字樓門口的燒痕（理由 RV）說動梁伯，蘇太跟著。
func _doubt_day4(game: Dictionary) -> void:
	eq(Rules.cross_check(game, "q1", "V1a").reason, "RV")
	_stamp(game, "doubt", ["q1"])
	Rules.present(game, "V1", "leung")
	Rules.present(game, "V1", "lam")
	eq(game.jurors.so.stamps.q1, "doubt", "蘇太見到你、梁伯、林小姐、馮 Sir 都疑，跟著疑")


# —— 十個結局的路 ——

func _path_one_day() -> Dictionary:
	var game := Rules.create_game({"seed": 7})
	_open(game, 1)
	_stamp(game, "trust", ["c1", "c2", "c3", "g1", "g2", "g3"])
	var result := _ballot(game, "G", "G")
	eq(result.tally.G, 5)
	var e := _end(game, result, game.day)
	return {"id": e.id, "day": game.day}


func _path_guilty() -> Dictionary:
	var game := Rules.create_game({"seed": 3})
	_open(game, 1)
	_stamp(game, "trust", ["c1", "c2", "c3", "g1", "g2", "g3"])
	_ballot(game, "U")
	_night(game, 1, "low")
	_open(game, 2)
	_stamp(game, "trust", ["w1", "w2", "k1"])
	# 你對保安蓋過疑，還是投了有罪：尾聲會翻到那一頁
	Rules.set_player_stamp(game, "g1", "doubt")
	var result := _ballot(game, "G", "G")
	var e := _end(game, result, game.day)
	check(_has(e.beats, "停在保安那一頁"), "良心的一頁")
	return {"id": e.id, "day": game.day}


func _path_quick_acquittal() -> Dictionary:
	var game := Rules.create_game({"seed": 3})
	_open(game, 1)
	_stamp(game, "trust", ["c1", "c2", "c3"])
	_ballot(game, "U")
	_night(game, 1, "fair")
	Rules.hear_day(game, 2)
	_stamp(game, "doubt", ["g1", "g2", "g3"])
	eq(Rules.cross_check(game, "g2", "D1b").reason, "R3")
	eq(Rules.cross_check(game, "g3", "D1b").reason, "R4")
	Rules.start_room(game)
	Rules.present(game, "D1", "leung")
	Rules.call_out(game, "d2-slip")
	Rules.present(game, "D1", "lam")
	var result := _ballot(game, "NG", "NG")
	var e := _end(game, result, game.day)
	return {"id": e.id, "day": game.day}


func _path_reasonable_doubt_day4() -> Dictionary:
	var game := Rules.create_game({"seed": 5})
	_doubt_day1(game)
	_doubt_day2(game)
	_doubt_day3(game)
	_day4_morning(game)
	Rules.hear_day(game, 4)
	Rules.start_room(game)
	_doubt_day4(game)
	var result := _ballot(game, "NG", "NG")
	eq(result.ballots.size(), 6, "羅生已經不在")
	eq(result.tally, {"G": 1, "NG": 5, "U": 0})
	var e := _end(game, result, game.day)
	return {"id": e.id, "day": game.day}


func _path_reasonable_doubt_day5() -> Dictionary:
	var game := Rules.create_game({"seed": 5})
	_doubt_day1(game)
	_doubt_day2(game)
	_doubt_day3(game)
	_day4_morning(game)
	Rules.hear_day(game, 4)
	Rules.start_room(game)
	_doubt_day4(game)
	# 第四天你還是投未決：四個陪審員無罪，仍然少一票
	var day4 := _ballot(game, "U")
	eq(day4.tally.NG, 4)
	_night(game, 4, "refuse")
	# 第五天不問被告在地下做過什麼（不遞紙條），沒有人信「另有起火點」+「地下點火」：沒有 A，只有無罪
	_open(game, 5)
	check(game.rules.has("r6") and game.rules.has("r7"))
	eq(Rules.alt_belief(game, "leung"), false, "q3 沒有聽過")
	var result := _ballot(game, "NG", "NG")
	var e := _end(game, result, game.day)
	return {"id": e.id, "day": game.day}


func _path_alternative() -> Dictionary:
	var game := Rules.create_game({"seed": 5})
	_doubt_day1(game)
	_doubt_day2(game)
	_doubt_day3(game)
	_day4_morning(game)
	# 第四天：放大過現場燒痕，才可以問區主任「會不會另有起火點」
	Rules.hear_day(game, 4)
	_slip(game, "au", "s-second")
	check(game.heard.has("q3"))
	Rules.start_room(game)
	_doubt_day4(game)
	_stamp(game, "trust", ["q3"])
	var day4 := _ballot(game, "U")
	eq(day4.tally.NG, 4, "梁、林、蘇、馮無罪；你未決，還差一票")
	_night(game, 4, "refuse")
	# 第五天：放大被告外套口袋的傳單，才可以問被告「地下做過什麼」
	Rules.hear_day(game, 5)
	Rules.add_exhibit(game, "P7")
	Rules.reveal_detail(game, "P7b")
	_slip(game, "ho", "s-downstairs")
	check(game.heard.has("d4"))
	Rules.start_room(game)
	_stamp(game, "trust", ["d4"])
	_stamp(game, "doubt", ["d1", "d2", "d3"])
	var votes: Dictionary = {}
	for id in Rules.active_jurors(game):
		votes[id] = Rules.ai_vote(game, id)
	eq(votes, {"leung": "A", "wong": "G", "lam": "A", "so": "A", "fung": "A"})
	var result := _ballot(game, "A", "A")
	eq(result.tally, {"G": 1, "NG": 0, "U": 0, "A": 5})
	var e := _end(game, result, game.day)
	return {"id": e.id, "day": game.day}


func _path_hung() -> Dictionary:
	var game := Rules.create_game({"seed": 11})
	for day in [1, 2, 3, 4]:
		_open(game, day)
		_ballot(game, "U")
		_night(game, day, NIGHT_PASS[day])
	_open(game, 5)
	# 四個陪審員有罪、馮 Sir 和林小姐無罪：你投無罪，四比三
	var result := _ballot(game, "NG")
	eq(result.tally, {"G": 4, "NG": 3, "U": 0, "A": 0})
	for session in [1, 2]:
		var intro := Rules.start_extension(game)
		eq(game.ext.session, session)
		check(intro.size() > 0)
		eq(game.room.actions, 2)
		Rules.ask(game, "fung")
		Rules.ask(game, "lam")
		eq(game.room.over, true)
		result = _ballot(game, "NG")
	var e := _end(game, null, game.day)
	return {"id": e.id, "day": game.day}


func _path_dismissed() -> Dictionary:
	var game := Rules.create_game({"seed": 2})
	_open(game, 1)
	_ballot(game, "U")
	_night(game, 1, "fair")
	_open(game, 2)
	_ballot(game, "U")
	var night := _night(game, 2, "tell")
	eq(night.out, "dismissed")
	# 第三天早上：報紙登出評議室的事，法官請你留低
	Rules.start_day(game, 3)
	var morning := Rules.morning_beats(game, 3)
	check(_has(morning, "獨家：陪審員透露"))
	var e := Rules.ending_of(game, null, 3)
	check(_has(e.beats, "今日報紙登出咗評議室嘅討論"))
	return {"id": e.id, "day": 3}


func _path_dismissed_declared() -> Dictionary:
	var game := Rules.create_game({"seed": 2})
	_open(game, 1)
	_ballot(game, "U")
	_night(game, 1, "generous")
	_open(game, 2)
	_ballot(game, "U")
	_night(game, 2, "declare")
	Rules.start_day(game, 3)
	check(not _has(Rules.morning_beats(game, 3), "獨家"), "申報利益不會見報")
	var e := Rules.ending_of(game, null, 3)
	check(_has(e.beats, "你申報咗利益"))
	return {"id": e.id, "day": 3}


func _path_bangle() -> Dictionary:
	var game := Rules.create_game({"seed": 4})
	for day in [1, 2]:
		_open(game, day)
		_ballot(game, "U")
		_night(game, day, "fair" if day == 1 else "silent")
	_open(game, 3)
	# 驗屍報告附頁的照片：龍鳳金鐲
	Rules.zoom(game, "P5")
	eq(Rules.cross_check(game, "f3", "P5b").kind, "thought")
	_ballot(game, "U")
	_night(game, 3, "report")
	eq(game.ext.out, "bangle")
	var e := Rules.ending_of(game, null, 3)
	return {"id": e.id, "day": 3}


func _path_bangle_guard_investigated() -> Dictionary:
	# 第二天的截電通知讓三個以上的陪審員疑保安：尾聲，保安被傳召
	var game := Rules.create_game({"seed": 3})
	_open(game, 1)
	_stamp(game, "trust", ["c1", "c2", "c3"])
	_ballot(game, "U")
	_night(game, 1, "fair")
	Rules.hear_day(game, 2)
	_stamp(game, "doubt", ["g1", "g2", "g3"])
	Rules.cross_check(game, "g2", "D1b")
	Rules.cross_check(game, "g3", "D1b")
	Rules.start_room(game)
	Rules.present(game, "D1", "leung")
	Rules.call_out(game, "d2-slip")
	Rules.present(game, "D1", "lam")
	_ballot(game, "U")
	_night(game, 2, "silent")
	_open(game, 3)
	Rules.reveal_detail(game, "P5b")
	_ballot(game, "U")
	_night(game, 3, "report")
	var e := Rules.ending_of(game, null, 3)
	check(_has(e.beats, "保安鍾永發被傳召協助調查"), "疑保安的人夠多")
	return {"id": e.id, "day": 3}


func _path_mistrial() -> Dictionary:
	var game := Rules.create_game({"seed": 6})
	for day in [1, 2]:
		_open(game, day)
		_ballot(game, "U")
		_night(game, day, "fair" if day == 1 else "silent")
	_doubt_day3(game)
	Rules.start_day(game, 4)
	check(Rules.cond(game, "dismissed:law"))
	Rules.hear_day(game, 4)
	Rules.start_room(game)
	_ballot(game, "U")
	var night := _night(game, 4, "report")
	eq(night.out, "mistrial")
	var e := Rules.ending_of(game, null, 4)
	check(_has(e.beats, "羅生用外套遮住了頭"), "羅生已經被解除")
	return {"id": e.id, "day": 4}


func _path_bribed() -> Dictionary:
	var game := Rules.create_game({"seed": 8})
	for day in [1, 2, 3, 4]:
		_open(game, day)
		_ballot(game, "U")
		if day < 4:
			_night(game, day, NIGHT_PASS[day])
	_night(game, 4, "take")
	eq(game.ext.flags.bribe, "taken")
	_open(game, 5)
	var result := _ballot(game, "G", "G")
	var e := _end(game, result, game.day)
	return {"id": e.id, "day": game.day}


func _has(beats: Array, needle: String) -> bool:
	for b in beats:
		if str(b["text"]).contains(needle):
			return true
	return false


# —— 測試 ——

func test_path_one_day() -> void:
	about("路：第一天你投第五票有罪 → 一日審判")
	var r := _path_one_day()
	eq(r.id, "oneDay")
	eq(r.day, 1)


func test_path_guilty() -> void:
	about("路：第一天未決，第二天投有罪，五票 → 罪成（良心的一頁）")
	var r := _path_guilty()
	eq(r.id, "guilty")
	eq(r.day, 2)


func test_path_quick_acquittal() -> void:
	about("路：第二天截電通知、指出羅生的失言，投無罪 → 速判無罪")
	var r := _path_quick_acquittal()
	eq(r.id, "quickAcquittal")
	eq(r.day, 2)


func test_path_reasonable_doubt_day4() -> void:
	about("路：三天質疑起火點、揭發羅生，第四天現場燒痕，投無罪 → 合理懷疑（六人五票）")
	var r := _path_reasonable_doubt_day4()
	eq(r.id, "reasonableDoubt")
	eq(r.day, 4)


func test_path_reasonable_doubt_day5() -> void:
	about("路：同一條路第四天未決，第五天投無罪（沒有聽過 q3）→ 合理懷疑")
	var r := _path_reasonable_doubt_day5()
	eq(r.id, "reasonableDoubt")
	eq(r.day, 5)


func test_path_alternative() -> void:
	about("路：第四天問另有起火點、第五天問地下點火，投 A → 替代裁決")
	var r := _path_alternative()
	eq(r.id, "alternative")
	eq(r.day, 5)


func test_path_hung() -> void:
	about("路：什麼都不做，第五天四比三，延長兩節之後 → 無法裁決")
	var r := _path_hung()
	eq(r.id, "hung")
	eq(r.day, 5)


func test_path_dismissed() -> void:
	about("路：第二晚對記者說了評議室的事 → 第三天早上被解除職務")
	var r := _path_dismissed()
	eq(r.id, "dismissed")
	eq(r.day, 3)
	r = _path_dismissed_declared()
	eq(r.id, "dismissed", "申報利益也是一樣的結局")


func test_path_bangle() -> void:
	about("路：看過驗屍報告的照片，第三晚報警 → 交出金鐲")
	var r := _path_bangle()
	eq(r.id, "bangle")
	r = _path_bangle_guard_investigated()
	eq(r.id, "bangle", "保安被傳召那個版本")


func test_path_mistrial() -> void:
	about("路：揭發羅生，第四晚舉報收買 → 審訊無效（羅生用外套遮頭）")
	var r := _path_mistrial()
	eq(r.id, "mistrial")


func test_path_bribed() -> void:
	about("路：第四晚收下五千元，第五天投有罪 → 收下五千元")
	var r := _path_bribed()
	eq(r.id, "bribed")
	eq(r.day, 5)


func test_all_endings_reachable() -> void:
	about("每一個結局都有一條走得到的路")
	var reached := {}
	for r in [
		_path_one_day(), _path_guilty(), _path_quick_acquittal(), _path_reasonable_doubt_day4(),
		_path_reasonable_doubt_day5(), _path_alternative(), _path_hung(), _path_dismissed(),
		_path_bangle(), _path_mistrial(), _path_bribed(),
	]:
		reached[r["id"]] = true
	for e in CaseData.table("ENDINGS"):
		check(reached.has(e["id"]), "結局 %s 走不到" % e["id"])
	eq(reached.size(), CaseData.table("ENDINGS").size())
