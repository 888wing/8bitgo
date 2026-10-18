# 規則引擎的對照測試：fixtures/rules_trace.json 是 tools/rules-trace.js 用 JS 版引擎玩出來的軌跡，
# 這裡用 GDScript 版從同一個種子重播同樣的呼叫，逐項比對回傳值和呼叫後的整份狀態。
# JS 的 undefined 在 JSON 裡會消失，所以「沒有這個鍵」和「值是 null」當作一樣；數字一律當作浮點數。
# 每一局只報第一個不同的地方，路徑寫成 狀態.jurors.leung.stamps.c1 這樣。
# 軌跡過時了（改了 case.js 或 engine.js）：在 repo 根目錄執行 node tools/rules-trace.js。
extends "res://tests/suite.gd"

const Rules := preload("res://scripts/rules/rules.gd")

const FIXTURE := "res://tests/fixtures/rules_trace.json"


func test_trace_matches_js() -> void:
	about("規則引擎：重播 JS 版的軌跡，回傳值和狀態逐項相同")
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(FIXTURE))
	if typeof(parsed) != TYPE_DICTIONARY:
		failures.append("讀不到 %s：先執行 node tools/rules-trace.js" % FIXTURE)
		return
	var games: Array = parsed["games"]
	check(games.size() > 0, "軌跡裡沒有任何一局")
	for g in games:
		var msg := _replay(g)
		if msg != "":
			failures.append(msg)


func _replay(g: Dictionary) -> String:
	var label := "%s %s" % [g["name"], JSON.stringify(g["opts"])]
	var game: Dictionary
	if g["opts"] == null:
		game = Rules.create_game()
	else:
		game = Rules.create_game(g["opts"])
	var expected: Variant = g["init"].duplicate(true)
	var d := _first_diff(_without_ext(game), expected, "狀態")
	if d != "":
		return "%s 剛建好：%s" % [label, d]
	var calls: Array = g["calls"]
	for i in calls.size():
		var c: Dictionary = calls[i]
		var args: Array = c["args"]
		var where := "%s 第 %d 步 %s(%s)" % [label, i + 1, c["fn"], JSON.stringify(args)]
		var ret: Variant = _invoke(game, c["fn"], args)
		d = _first_diff(ret, c.get("ret"), "回傳")
		if d != "":
			return "%s：%s" % [where, d]
		if c.has("patch"):
			expected = _patch(expected, c["patch"])
		d = _first_diff(_without_ext(game), expected, "狀態")
		if d != "":
			return "%s：%s" % [where, d]
	d = _first_diff(expected, g["final"], "狀態")
	if d != "":
		return "%s：軌跡檔本身不一致（逐步還原的狀態和 final 不同）%s" % [label, d]
	return ""


# 第三至五天新增的狀態都在 game.ext，JS 版沒有，比對時不看它。
func _without_ext(game: Dictionary) -> Dictionary:
	var copy := game.duplicate()
	copy.erase("ext")
	return copy


# 呼叫和 JS 的 E.xxx(game, ...args) 一一對應。
func _invoke(game: Dictionary, fn: String, a: Array) -> Variant:
	match fn:
		"$day":
			game.day = int(a[0])
		"hearClaim":
			return Rules.hear_claim(game, a[0])
		"strikeClaim":
			Rules.strike_claim(game, a[0])
		"addExhibit":
			Rules.add_exhibit(game, a[0])
		"addRule":
			Rules.add_rule(game, a[0])
		"canZoom":
			return Rules.can_zoom(game, a[0])
		"zoom":
			return Rules.zoom(game, a[0])
		"revealDetail":
			return Rules.reveal_detail(game, a[0])
		"visibleDetails":
			return Rules.visible_details(game, a[0])
		"setPlayerStamp":
			var record := true
			if a.size() > 2:
				record = bool(a[2].get("record", true))
			return Rules.set_player_stamp(game, a[0], a[1], record)
		"stampHistory":
			return Rules.stamp_history(game, a[0])
		"crossCheck":
			return Rules.cross_check(game, a[0], a[1])
		"effective":
			return Rules.effective(game, a[0], a[1])
		"linkStatus":
			return Rules.link_status(game, a[0], a[1])
		"linkStatuses":
			return Rules.link_statuses(game, a[0])
		"beliefOf":
			return Rules.belief_of(game, a[0])
		"aiVote":
			return Rules.ai_vote(game, a[0])
		"startRoom":
			return Rules.start_room(game)
		"clockLabel":
			return Rules.clock_label(game)
		"cards":
			return Rules.cards(game)
		"present":
			return Rules.present(game, a[0], a[1])
		"ask":
			return Rules.ask(game, a[0])
		"callOut":
			return Rules.call_out(game, a[0])
		"callVote":
			return Rules.call_vote(game)
		"boardCell":
			return Rules.board_cell(game, a[0], a[1])
		"vote":
			return Rules.vote(game, a[0])
		"conscience":
			return Rules.conscience(game)
		"doubtedClaims":
			return Rules.doubted_claims(game)
		"seatOf":
			return Rules.seat_of(a[0])
		"callOf":
			return Rules.call_of(a[0])
		_:
			failures.append("軌跡裡有不認得的函數：%s" % fn)
	return null


# 還原狀態：物件逐層合併（刪掉的鍵是 null），其餘整個換掉。
func _patch(base: Variant, patch: Variant) -> Variant:
	if typeof(base) == TYPE_DICTIONARY and typeof(patch) == TYPE_DICTIONARY:
		for k in patch:
			base[k] = _patch(base.get(k), patch[k])
		return base
	if typeof(patch) == TYPE_DICTIONARY or typeof(patch) == TYPE_ARRAY:
		return patch.duplicate(true)
	return patch


func _show(v: Variant) -> String:
	var s := JSON.stringify(v)
	return s if s.length() <= 160 else s.substr(0, 160) + "…"


# 回傳第一個不同的地方；一樣就回傳空字串。
func _first_diff(actual: Variant, expected: Variant, path: String) -> String:
	var ta := typeof(actual)
	var tb := typeof(expected)
	if ta == TYPE_NIL and tb == TYPE_NIL:
		return ""
	if (ta == TYPE_INT or ta == TYPE_FLOAT) and (tb == TYPE_INT or tb == TYPE_FLOAT):
		if float(actual) == float(expected):
			return ""
	elif (ta == TYPE_STRING or ta == TYPE_STRING_NAME) and (tb == TYPE_STRING or tb == TYPE_STRING_NAME):
		if String(actual) == String(expected):
			return ""
	elif ta == TYPE_ARRAY and tb == TYPE_ARRAY:
		var n := mini(actual.size(), expected.size())
		for i in n:
			var d := _first_diff(actual[i], expected[i], "%s[%d]" % [path, i])
			if d != "":
				return d
		if actual.size() == expected.size():
			return ""
		return "%s 的長度：得到 %d，應該是 %d（得到 %s，應該是 %s）" % [path, actual.size(), expected.size(), _show(actual), _show(expected)]
	elif ta == TYPE_DICTIONARY and tb == TYPE_DICTIONARY:
		for k in actual:
			var d := _first_diff(actual[k], expected.get(k), "%s.%s" % [path, str(k)])
			if d != "":
				return d
		for k in expected:
			if not actual.has(k):
				var d := _first_diff(null, expected[k], "%s.%s" % [path, str(k)])
				if d != "":
					return d
		return ""
	elif ta == tb and actual == expected:
		return ""
	return "%s：得到 %s，應該是 %s" % [path, _show(actual), _show(expected)]
