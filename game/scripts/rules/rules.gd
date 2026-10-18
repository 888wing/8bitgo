# 規則引擎：只處理狀態，不碰畫面。畫面、測試和模擬都直接用它。
# 由 prototype/engine.js 移植，函數名改成 snake_case，行為逐項對照（tests/test_rules_trace.gd 會驗證）。
# 狀態是一個 Dictionary，鍵名和 JS 的 game 物件一樣；事件是 Dictionary 組成的 Array。
# 用法：const Rules := preload("res://scripts/rules/rules.gd")，然後 Rules.create_game()。
# 第三至五天的規則（engine.js 沒有）：新增的狀態全在 game.ext；條件、早晨、紙條、夜晚、結局接在檔案後半。
extends RefCounted

const CaseData := preload("res://scripts/rules/case_data.gd")

const CLOCK: Array = ["下午三時", "下午三時半", "下午四時", "下午四時半"]
const ACTIONS_PER_ROOM := 3


# JS 的 ??：只有 null 才換成後備值。
static func _or(value: Variant, fallback: Variant) -> Variant:
	if value == null:
		return fallback
	return value


# JS 的真值：null、false、0、空字串是假；陣列和物件一律是真。
static func _truthy(value: Variant) -> bool:
	match typeof(value):
		TYPE_NIL:
			return false
		TYPE_BOOL:
			return value
		TYPE_INT, TYPE_FLOAT:
			return value != 0
		TYPE_STRING, TYPE_STRING_NAME:
			return str(value) != ""
	return true


# JS 把 undefined 寫進字串會變成 "undefined"。
static func _text(value: Variant) -> String:
	if value == null:
		return "undefined"
	return str(value)


# opts 的 seed 預設是 1；0 也當作 1。
static func create_game(opts: Dictionary = {}) -> Dictionary:
	var jurors := {}
	for id in CaseData.table("AI_IDS"):
		jurors[id] = {"stamps": {}, "revealed": {}, "overrides": {}, "usingStruck": {}}
	var seed_value: Variant = opts.get("seed")
	var rng := 1
	if seed_value != null:
		rng = int(seed_value) & 0xFFFFFFFF
		if rng == 0:
			rng = 1
	return {
		"day": 1,
		"heard": [],
		"struck": {},
		"exhibits": [],
		"zoomed": {},
		"rules": ["r1", "r2", "r3", "r4"],
		"player": {"stamps": {}, "history": [], "reasons": [], "votes": []},
		"jurors": jurors,
		"room": null,
		"lastResult": null,
		"rng": rng,
		"ext": _new_ext(),
	}


# 第三至五天新增的狀態全放在 game.ext，第一、二天的狀態和回傳值一點都不變（對照測試不比 ext）。
#   struck_exhibits：被法官剔除的證物，例如 {"P4": true}
#   dismissed：陪審員 id → 解除職務生效的那一天
#   exposed：陪審員 id → 被你揭發的那一天（下一次 start_day 才解除職務）
#   flags：夜晚的選擇留下的記號：jade、press、bangle、bribe
#   slips：str(天) → 當天用了哪一張提問紙條（每天一張）
#   said：評議室的插話 id → 說出口的那一天。room.fired 每天重來，這裡跨日記住（條件 said:）
#   final：今天的表決沒有「未決」
#   session：0 是一般的評議室；1、2 是最後一天的延長評議
#   out：你因此離開審判的原因："dismissed"、"bangle"、"mistrial"，沒有就是 null
#   verdict：ending_of 寫進來："G"、"NG"、"A"、"none"
static func _new_ext() -> Dictionary:
	return {
		"struck_exhibits": {},
		"dismissed": {},
		"exposed": {},
		"flags": {},
		"slips": {},
		"said": {},
		"final": false,
		"session": 0,
		"out": null,
		"verdict": null,
	}


static func seat_of(id: Variant) -> Variant:
	for s in CaseData.table("SEATS"):
		if s["id"] == id:
			return s
	return null


static func call_of(id: Variant) -> Variant:
	var seat: Variant = seat_of(id)
	if seat != null and seat.get("call") != null:
		return seat["call"]
	return id


# —— 法庭 ——

static func hear_claim(game: Dictionary, id: String) -> bool:
	if game.heard.has(id):
		return false
	game.heard.append(id)
	var jurors: Dictionary = CaseData.table("JURORS")
	for jid in CaseData.table("AI_IDS"):
		game.jurors[jid].stamps[id] = jurors[jid]["initial"].get(id)
	return true


static func strike_claim(game: Dictionary, id: String) -> void:
	game.struck[id] = true


static func add_exhibit(game: Dictionary, id: String) -> void:
	if not game.exhibits.has(id):
		game.exhibits.append(id)


static func add_rule(game: Dictionary, id: String) -> void:
	if not game.rules.has(id):
		game.rules.append(id)


# 法官叫陪審團忽略一件證物：以它為「推出去的那件東西」的理由不能再用（見 cards）。
static func strike_exhibit(game: Dictionary, id: String) -> void:
	game.ext.struck_exhibits[id] = true


# —— 日子、人數 ——

# 新的一天開庭：被揭發的陪審員在這一天早上解除職務；最後一天沒有「未決」。
# 開庭時法官的話（DAYS 的 open、closing）由畫面逐句播，再呼叫 strike_claim、strike_exhibit、add_rule；
# 測試和模擬用 hear_day 一次播完。
static func start_day(game: Dictionary, day: int) -> void:
	var days: Array = CaseData.table("DAYS")
	if day < 1 or day > days.size():
		push_error("沒有第 %d 天" % day)
		return
	game.day = day
	var ext: Dictionary = game.ext
	for jid in ext.exposed.keys():
		if int(ext.exposed[jid]) < day:
			ext.dismissed[jid] = day
			ext.exposed.erase(jid)
	ext.final = bool(days[day - 1].get("final", false))
	ext.session = 0


# 還在評議室的陪審員：六位減去已解除職務的。
static func active_jurors(game: Dictionary) -> Array:
	var out := []
	for id in CaseData.table("AI_IDS"):
		if not game.ext.dismissed.has(id):
			out.append(id)
	return out


# 最後一天，而且法官講過替代罪名（r7）：表決多一個「縱火罪成立」（A）。
static func alt_available(game: Dictionary) -> bool:
	return bool(game.ext.final) and game.rules.has("r7")


static func can_zoom(game: Dictionary, exhibit_id: String) -> bool:
	for d in CaseData.table("EXHIBITS")[exhibit_id]["details"]:
		if _truthy(d.get("zoom")) and not _truthy(game.zoomed.get(d["id"])):
			return true
	return false


static func zoom(game: Dictionary, exhibit_id: String) -> Array:
	var found := []
	for d in CaseData.table("EXHIBITS")[exhibit_id]["details"]:
		if _truthy(d.get("zoom")) and not _truthy(game.zoomed.get(d["id"])):
			game.zoomed[d["id"]] = true
			found.append(d)
	return found


# 放大鏡移到某一處才發現那個細節（桌面版用）；文字版用上面的 zoom，一次看整件證物。
static func reveal_detail(game: Dictionary, detail_id: String) -> bool:
	if _truthy(game.zoomed.get(detail_id)):
		return false
	var known := false
	for ex in CaseData.table("EXHIBITS").values():
		for d in ex["details"]:
			if d["id"] == detail_id and _truthy(d.get("zoom")):
				known = true
	if not known:
		return false
	game.zoomed[detail_id] = true
	return true


static func visible_details(game: Dictionary, exhibit_id: String) -> Array:
	var out := []
	for d in CaseData.table("EXHIBITS")[exhibit_id]["details"]:
		if not _truthy(d.get("zoom")) or _truthy(game.zoomed.get(d["id"])):
			out.append(d)
	return out


# value："trust"、"doubt"、"struck" 或 null（留空）。改印章時記下舊的，筆記本會把它劃掉。
# 證人退庭前在印章盤上改來改去不算改主意，所以 record 為 false。
static func set_player_stamp(game: Dictionary, claim_id: String, value: Variant, record := true) -> bool:
	var prev: Variant = game.player.stamps.get(claim_id)
	if typeof(prev) == typeof(value) and prev == value:
		return false
	if record and prev != null and prev != "struck":
		game.player.history.append({"claim": claim_id, "from": prev, "to": value, "day": game.day})
	game.player.stamps[claim_id] = value
	return true


static func stamp_history(game: Dictionary, claim_id: String) -> Array:
	var out := []
	for h in game.player.history:
		if h["claim"] == claim_id:
			out.append(h["from"])
	return out


static func cross_check(game: Dictionary, a: String, b: String) -> Dictionary:
	var reasons: Dictionary = CaseData.table("REASONS")
	for id in reasons:
		var reason: Dictionary = reasons[id]
		if not _pairs_match(reason.get("pairs"), a, b):
			continue
		if game.player.reasons.has(id):
			return {"kind": "known", "reason": id}
		game.player.reasons.append(id)
		return {"kind": "reason", "reason": id}
	for t in CaseData.table("THOUGHTS"):
		if _pair_matches(t["pair"], a, b):
			return {"kind": "thought", "text": t["text"]}
	return {"kind": "none"}


static func _pair_matches(pair: Array, a: String, b: String) -> bool:
	return (pair[0] == a and pair[1] == b) or (pair[0] == b and pair[1] == a)


static func _pairs_match(pairs: Variant, a: String, b: String) -> bool:
	if pairs == null:
		return false
	for pair in pairs:
		if _pair_matches(pair, a, b):
			return true
	return false


# —— 判斷 ——

static func effective(game: Dictionary, who: String, claim_id: String) -> Variant:
	if who == "you":
		if _truthy(game.struck.get(claim_id)):
			return null
		return game.player.stamps.get(claim_id)
	var j: Dictionary = game.jurors[who]
	if _truthy(game.struck.get(claim_id)):
		if _truthy(j.usingStruck.get(claim_id)):
			return "trust"
		return null
	if j.overrides.has(claim_id):
		return j.overrides[claim_id]["value"]
	return j.stamps.get(claim_id)


# 一個環：信的說法多於疑的就成立，疑的多就存疑，其餘未知。
static func link_status(game: Dictionary, who: String, link_id: String) -> String:
	var claims: Dictionary = CaseData.table("CLAIMS")
	var trust := 0
	var doubt := 0
	for id in game.heard:
		if claims[id]["link"] != link_id:
			continue
		var s: Variant = effective(game, who, id)
		# against：辯方的說法。信它，這一環就存疑；疑它，對這一環沒有影響。
		var against: bool = _truthy(claims[id].get("against"))
		if s == "trust":
			if against:
				doubt += 1
			else:
				trust += 1
		elif s == "doubt" and not against:
			doubt += 1
	if trust > doubt:
		return "est"
	if doubt > trust:
		return "doubt"
	return "unknown"


static func link_statuses(game: Dictionary, who: String) -> Dictionary:
	var out := {}
	for l in CaseData.table("LINKS"):
		out[l["id"]] = link_status(game, who, l["id"])
	return out


static func belief_of(game: Dictionary, who: String) -> String:
	var st := link_statuses(game, who)
	if who != "you" and CaseData.table("JURORS")[who].get("rule") == "motiveEnough" and st["motive"] == "est" and st["presence"] == "est":
		return "G"
	var required := []
	var supporting := []
	for l in CaseData.table("LINKS"):
		if l["required"]:
			required.append(st[l["id"]])
		else:
			supporting.append(st[l["id"]])
	if required.has("doubt"):
		return "NG"
	var all_est := true
	for s in required:
		if s != "est":
			all_est = false
	if all_est and supporting.has("est"):
		return "G"
	return "U"


# 替代罪名成不成立：照 ALTERNATIVE.when 看某人的印章（stamp: 是他有效的印章）。
static func alt_belief(game: Dictionary, who: String) -> bool:
	return cond(game, CaseData.table("ALTERNATIVE")["when"], who)


static func ai_vote(game: Dictionary, id: String) -> String:
	var belief := belief_of(game, id)
	var style: Variant = CaseData.table("JURORS")[id].get("vote")
	if style == "guilty":
		return "G"
	if game.ext.final:
		# 最後一天沒有未決：不肯定的人，急性子投有罪，其餘投無罪。
		if alt_available(game) and belief != "G" and alt_belief(game, id):
			return "A"
		if belief == "U":
			return "G" if style == "impatient" else "NG"
		return belief
	if style == "impatient" and int(game.day) >= 2 and belief == "U":
		return "G"
	return belief


# —— 評議室 ——

static func _line(who: Variant, text: Variant) -> Dictionary:
	return {"type": "line", "who": who, "text": text}


static func _flip(game: Dictionary, jid: String, claim_id: String, value: Variant, cause: String) -> Dictionary:
	var j: Dictionary = game.jurors[jid]
	var from_value: Variant = j.stamps.get(claim_id)
	j.stamps[claim_id] = value
	j.revealed[claim_id] = true
	return {"type": "flip", "juror": jid, "claim": claim_id, "from": from_value, "to": value, "cause": cause}


static func _say(game: Dictionary, st: Dictionary) -> Array:
	var room: Dictionary = game.room
	var events := []
	var reveal: Array = _or(st.get("reveal"), [])
	for id in reveal:
		game.jurors[st["juror"]].revealed[id] = true
	room.statements.append({"id": st["id"], "juror": st["juror"], "text": st["text"], "improper": _truthy(st.get("improper")), "active": true})
	var effect: Variant = st.get("effect")
	if effect != null and _truthy(effect.get("usingStruck")):
		for jid in effect["jurors"]:
			game.jurors[jid].usingStruck[effect["usingStruck"]] = st["id"]
	if effect != null and effect.get("override") != null:
		for jid in effect["jurors"]:
			for id in effect["override"]:
				if game.heard.has(id):
					game.jurors[jid].overrides[id] = {"value": effect["value"], "by": st["id"]}
	events.append({"type": "reveal", "juror": st["juror"], "claims": reveal.duplicate()})
	events.append(_line(st["juror"], st["text"]))
	var gives: Variant = st.get("gives")
	if _truthy(gives) and not game.player.reasons.has(gives):
		game.player.reasons.append(gives)
		events.append({"type": "borrow", "reason": gives})
		events.append(_line("旁白", "你在筆記上記下%s的說法。" % _text(call_of(st["juror"]))))
	return events


static func _undo(game: Dictionary, statement_id: String) -> void:
	for jid in CaseData.table("AI_IDS"):
		var j: Dictionary = game.jurors[jid]
		for id in j.usingStruck.keys():
			if j.usingStruck[id] == statement_id:
				j.usingStruck.erase(id)
		for id in j.overrides.keys():
			if j.overrides[id]["by"] == statement_id:
				j.overrides.erase(id)


# 黑板：這一天的格子裡，聽過而且沒有被剔除的說法。
static func _board_of(game: Dictionary, room_def: Dictionary) -> Array:
	var board := []
	for id in room_def["board"]:
		if game.heard.has(id) and not _truthy(game.struck.get(id)):
			board.append(id)
	return board


static func start_room(game: Dictionary) -> Array:
	var room_def: Dictionary = CaseData.table("ROOMS")[str(int(game.day))]
	game.room = {
		"day": game.day,
		"board": _board_of(game, room_def),
		"actions": ACTIONS_PER_ROOM,
		"clock": 0,
		"statements": [],
		"fired": {},
		"over": false,
		"result": null,
	}
	var events := []
	for b in room_def["intro"]:
		events.append(_line(b["who"], b["text"]))
	for st in room_def["openings"]:
		if game.ext.dismissed.has(st["juror"]):
			continue
		events.append_array(_say(game, st))
	return events


# 最後一天沒有五票：延長評議，最多兩節。沒有開場發言，只有兩個動作；
# 黑板照舊，陪審員已經翻開的格子不收回。傳回開場的對白，和 start_room 一樣。
# 畫面在表決沒有結果、而且 ext.session 小於 2 時呼叫；第二節仍然沒有結果，就是無法裁決。
static func start_extension(game: Dictionary) -> Array:
	var day := int(game.day)
	var room_def: Dictionary = CaseData.table("ROOMS")[str(day)]
	if not game.ext.final or not room_def.has("extension"):
		push_error("第 %d 天沒有延長評議" % day)
		return []
	if int(game.ext.session) >= 2:
		push_error("延長評議最多兩節")
		return []
	game.ext.session += 1
	# 兩個動作用完剛好四點半：鐘從三點半起。
	game.room = {
		"day": game.day,
		"board": _board_of(game, room_def),
		"actions": 2,
		"clock": ACTIONS_PER_ROOM - 2,
		"statements": [],
		"fired": {},
		"over": false,
		"result": null,
		"session": game.ext.session,
	}
	var events := []
	for b in room_def["extension"]:
		events.append(_line(b["who"], b["text"]))
	return events


static func clock_label(game: Dictionary) -> String:
	if game.room == null:
		return ""
	return CLOCK[mini(int(game.room.clock), CLOCK.size() - 1)]


static func cards(game: Dictionary) -> Array:
	var reasons: Dictionary = CaseData.table("REASONS")
	var names: Dictionary = CaseData.table("CARD_NAMES")
	var by_card := {}
	for id in game.player.reasons:
		var card: String = reasons[id]["card"]
		if game.ext.struck_exhibits.has(card):
			continue
		if not by_card.has(card):
			by_card[card] = []
		by_card[card].append(id)
	var out := []
	for card in by_card:
		out.append({"card": card, "name": names.get(card), "reasons": by_card[card]})
	return out


static func _apply_reasons(game: Dictionary, jid: String, reason_ids: Array) -> Dictionary:
	var def: Dictionary = CaseData.table("JURORS")[jid]
	var reasons: Dictionary = CaseData.table("REASONS")
	var j: Dictionary = game.jurors[jid]
	var out := {"flips": [], "accepted": false, "swayed": false}
	var locks: Dictionary = _or(def.get("locks"), {})
	for rid in reason_ids:
		if not def["accepts"].has(rid):
			continue
		var r: Dictionary = reasons[rid]
		for id in r["claims"]:
			if not game.heard.has(id) or _truthy(game.struck.get(id)):
				continue
			var keys: Variant = locks.get(id)
			if keys != null and not keys.has(rid):
				continue
			out["accepted"] = true
			if j.overrides.has(id) and j.overrides[id]["value"] != r["effect"]:
				out["swayed"] = true
			if j.stamps.get(id) != r["effect"]:
				out["flips"].append(_flip(game, jid, id, r["effect"], "reason"))
			else:
				j.revealed[id] = true
	return out


static func _reaction(jid: String, card: String, res: Dictionary) -> Variant:
	var table: Dictionary = CaseData.table("REACTIONS")[jid]
	var spec: Dictionary = _or(table.get(card), {})
	var base: Dictionary = table["default"]
	if res["swayed"]:
		return _or(CaseData.table("JURORS")[jid].get("swayed"), base.get("reject"))
	if res["flips"].size() > 0:
		return _or(spec.get("flip"), base.get("flip"))
	if res["accepted"]:
		return _or(spec.get("agree"), base.get("agree"))
	return _or(spec.get("reject"), base.get("reject"))


# 同一個證人有兩句被他存疑，他連這個證人其餘的說法也不再相信。
static func _contagion(game: Dictionary, jid: String) -> Array:
	var claims: Dictionary = CaseData.table("CLAIMS")
	var j: Dictionary = game.jurors[jid]
	var locks: Dictionary = _or(CaseData.table("JURORS")[jid].get("locks"), {})
	var by_witness := {}
	for id in game.heard:
		if _truthy(game.struck.get(id)):
			continue
		var w: String = claims[id]["witness"]
		if not by_witness.has(w):
			by_witness[w] = []
		by_witness[w].append(id)
	var flips := []
	for ids in by_witness.values():
		var doubted := 0
		for id in ids:
			if j.stamps.get(id) == "doubt":
				doubted += 1
		if doubted < 2:
			continue
		for id in ids:
			if j.stamps.get(id) != "doubt" and not locks.has(id):
				flips.append(_flip(game, jid, id, "doubt", "contagion"))
	return flips


# 跟大隊的人：黑板上看得見的意見裡，有四個和他相反，他就改。
static func _conformity(game: Dictionary, jid: String) -> Array:
	var j: Dictionary = game.jurors[jid]
	var locks: Dictionary = _or(CaseData.table("JURORS")[jid].get("locks"), {})
	var flips := []
	for id in game.room.board:
		if _truthy(game.struck.get(id)) or locks.has(id):
			continue
		var mine: Variant = j.stamps.get(id)
		for want in ["doubt", "trust"]:
			if mine == want:
				continue
			var count := 1 if effective(game, "you", id) == want else 0
			for other in active_jurors(game):
				if other != jid and _truthy(game.jurors[other].revealed.get(id)) and effective(game, other, id) == want:
					count += 1
			if count >= 4:
				flips.append(_flip(game, jid, id, want, "conformity"))
				break
	return flips


static func _settle(game: Dictionary) -> Array:
	var jurors: Dictionary = CaseData.table("JURORS")
	var claims: Dictionary = CaseData.table("CLAIMS")
	var events := []
	for _n in 3:
		var changed := false
		for jid in active_jurors(game):
			var flips := _contagion(game, jid)
			if flips.size() > 0:
				changed = true
				events.append_array(flips)
				events.append(_line(jid, _or(jurors[jid].get("contagion"), "……")))
		for jid in active_jurors(game):
			if not _truthy(jurors[jid].get("conformist")):
				continue
			for f in _conformity(game, jid):
				changed = true
				var word := "疑" if f["to"] == "doubt" else "信"
				events.append(f)
				events.append(_line("旁白", "%s望望其他人，把「%s」改成了「%s」。" % [_text(call_of(jid)), claims[f["claim"]]["label"], word]))
		if not changed:
			break
	return events


static func _trigger(kind: String, game: Dictionary, act: Dictionary) -> bool:
	match kind:
		"afterFirst":
			return game.room.actions == ACTIONS_PER_ROOM - 1
		"slip":
			return act.get("card") == "D1" or game.room.actions <= 1
	return false


static func _interjections(game: Dictionary, act: Dictionary) -> Array:
	var events := []
	# 延長評議（最後一天的第二、三節）沒有插話。
	if int(game.ext.session) > 0:
		return events
	for it in CaseData.table("ROOMS")[str(int(game.day))]["interjections"]:
		if game.ext.dismissed.has(it["juror"]):
			continue
		if _truthy(game.room.fired.get(it["id"])) or not _trigger(it["when"], game, act):
			continue
		game.room.fired[it["id"]] = true
		game.ext.said[it["id"]] = int(game.day)
		events.append_array(_say(game, it))
		if it.has("reply"):
			var r: Dictionary = it["reply"]
			var text: String = r["doubt"] if effective(game, r["juror"], r["claim"]) == "doubt" else r["otherwise"]
			events.append(_line(r["juror"], text))
	return events


static func _spend(game: Dictionary, act: Dictionary) -> Array:
	var room: Dictionary = game.room
	room["actions"] -= 1
	room["clock"] += 1
	var events := _interjections(game, act)
	events.append_array(_settle(game))
	if room["actions"] <= 0 and not room["over"]:
		room["over"] = true
		events.append(_line("旁白", "四點半，庭警敲門：「夠鐘表決。」"))
	return events


static func present(game: Dictionary, card: String, target: String) -> Array:
	var room: Variant = game.room
	if room == null or room["over"]:
		return []
	var reasons: Dictionary = CaseData.table("REASONS")
	var jurors: Dictionary = CaseData.table("JURORS")
	var ids := []
	for id in game.player.reasons:
		if reasons[id]["card"] == card:
			ids.append(id)
	var events := [_line("旁白", "你把%s推到%s面前。" % [_text(CaseData.table("CARD_NAMES").get(card)), _text(call_of(target))])]
	var res := _apply_reasons(game, target, ids)
	events.append_array(res["flips"])
	events.append(_line(target, _reaction(target, card, res)))
	if target != "fung":
		var lean := []
		for id in ids:
			if jurors["fung"]["leansIn"].has(id):
				lean.append(id)
		if lean.size() > 0:
			var r2 := _apply_reasons(game, "fung", lean)
			if r2["flips"].size() > 0:
				events.append_array(r2["flips"])
				var lean_text: Variant = CaseData.table("LEAN_IN").get(card)
				if lean_text == null:
					lean_text = _reaction("fung", card, r2)
				events.append(_line("fung", lean_text))
	events.append_array(_settle(game))
	events.append_array(_spend(game, {"kind": "present", "card": card, "target": target}))
	return events


static func ask(game: Dictionary, target: String) -> Array:
	var room: Variant = game.room
	if room == null or room["over"]:
		return []
	var def: Dictionary = CaseData.table("JURORS")[target]
	var j: Dictionary = game.jurors[target]
	for id in room["board"]:
		j.revealed[id] = true
	var gives: Variant = def.get("gives")
	var events := [
		_line("旁白", "你問%s：「你點睇？」" % _text(call_of(target))),
		{"type": "reveal", "juror": target, "claims": room["board"].duplicate()},
	]
	if _truthy(gives) and not game.player.reasons.has(gives):
		game.player.reasons.append(gives)
		events.append(_line(target, def.get("ask")))
		events.append({"type": "borrow", "reason": gives})
		events.append(_line("旁白", "你在筆記上記下%s的看法。" % _text(call_of(target))))
	else:
		events.append(_line(target, def.get("askAgain") if _truthy(gives) else def.get("ask")))
	room["statements"].append({"id": "ask-%s-%d" % [target, room["clock"]], "juror": target, "text": def.get("ask"), "improper": false, "active": true})
	events.append_array(_spend(game, {"kind": "ask", "target": target}))
	return events


# 評議室裡的發言在 ROOMS 的原始定義（開場發言或插話）；找不到就是空的。
static func _statement_def(game: Dictionary, statement_id: String) -> Dictionary:
	var room_def: Dictionary = CaseData.table("ROOMS")[str(int(game.room["day"]))]
	for list_name in ["openings", "interjections"]:
		for st in room_def[list_name]:
			if st["id"] == statement_id:
				return st
	return {}


static func call_out(game: Dictionary, statement_id: String) -> Array:
	var room: Variant = game.room
	if room == null or room["over"]:
		return []
	var st: Variant = null
	for s in room["statements"]:
		if s["id"] == statement_id:
			st = s
			break
	var who: Variant = null
	if st != null:
		who = st["juror"]
	var events := [_line("旁白", "你翻開《陪審員須知》，指著%s剛才那句話。" % _text(call_of(who)))]
	var callout: Dictionary = CaseData.table("CALLOUT")
	if st != null and st["improper"] and st["active"]:
		st["active"] = false
		_undo(game, st["id"])
		# 失言有 expose：主席會報告法官，那位陪審員下一次開庭就被解除職務。
		var effect: Variant = _statement_def(game, st["id"]).get("effect")
		if effect != null and effect.get("expose") != null:
			game.ext.exposed[effect["expose"]] = game.day
		for b in _filter_beats(game, callout[st["id"]]):
			events.append(_line(b["who"], b["text"]))
		events.append({"type": "refresh"})
	else:
		for b in callout["invalid"]:
			events.append(_line(b["who"], b["text"]))
	events.append_array(_settle(game))
	events.append_array(_spend(game, {"kind": "callout"}))
	return events


static func call_vote(game: Dictionary) -> Array:
	if game.room == null or game.room["over"]:
		return []
	game.room["over"] = true
	return [_line("旁白", "你請主席現在就表決。"), _line("leung", "好，而家表決。")]


static func board_cell(game: Dictionary, who: String, claim_id: String) -> String:
	if who == "you":
		return _or(game.player.stamps.get(claim_id), "blank")
	var j: Dictionary = game.jurors[who]
	if not _truthy(j.revealed.get(claim_id)):
		return "hidden"
	return _or(effective(game, who, claim_id), "blank")


# 32 位元無號整數的乘法（Math.imul），先拆開乘才不會超出 64 位元。
static func _imul(a: int, b: int) -> int:
	a &= 0xFFFFFFFF
	b &= 0xFFFFFFFF
	return (a * (b & 0xFFFF) + (((a * (b >> 16)) & 0xFFFF) << 16)) & 0xFFFFFFFF


# 洗牌的亂數：和 JS 版逐位元一樣，同一個種子要得到同一個次序。
static func _shuffle(list: Array, game: Dictionary) -> Array:
	var i := list.size() - 1
	while i > 0:
		game.rng = (int(game.rng) + 0x6d2b79f5) & 0xFFFFFFFF
		var t: int = game.rng
		t = _imul(t ^ (t >> 15), t | 1)
		t = t ^ ((t + _imul(t ^ (t >> 7), t | 61)) & 0xFFFFFFFF)
		var k := int(floor(float((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0 * (i + 1)))
		var tmp: Variant = list[i]
		list[i] = list[k]
		list[k] = tmp
		i -= 1
	return list


# 表決：還在評議室的陪審員各一票，加上你的（你已離開審判就沒有）。五票就是裁決。
# 最後一天沒有「未決」，你投未決當作無罪；法官講過替代罪名的話，多一個「A」（縱火罪成立）。
static func vote(game: Dictionary, player_vote: String) -> Dictionary:
	var ext: Dictionary = game.ext
	var alt := alt_available(game)
	var in_play: bool = not _truthy(ext.out)
	var cast := player_vote
	if in_play and ext.final and cast == "U":
		push_error("最後一天的表決不設未決：當作投無罪。")
		cast = "NG"
	if in_play and cast == "A" and not alt:
		push_error("現在不可以投替代罪名：當作投無罪。")
		cast = "NG"
	var ballots := []
	for id in active_jurors(game):
		ballots.append({"who": id, "vote": ai_vote(game, id)})
	if in_play:
		ballots.append({"who": "you", "vote": cast})
	_shuffle(ballots, game)
	var tally := {"G": 0, "NG": 0, "U": 0}
	if alt:
		tally["A"] = 0
	for b in ballots:
		tally[b["vote"]] += 1
	var verdict: Variant = null
	if tally["G"] >= 5:
		verdict = "G"
	elif tally["NG"] >= 5:
		verdict = "NG"
	elif alt and tally["A"] >= 5:
		verdict = "A"
	if in_play:
		game.player.votes.append({"day": game.day, "vote": cast, "belief": belief_of(game, "you")})
	var result := {"ballots": ballots, "tally": tally, "verdict": verdict}
	if game.room != null:
		game.room["result"] = result
	game.lastResult = result
	return result


# 信與投之間的距離：投有罪，但筆記本推不出有罪；或者反過來。
static func conscience(game: Dictionary) -> Array:
	var out := []
	for v in game.player.votes:
		var c: Dictionary = v.duplicate()
		c["mismatch"] = (v["vote"] == "G" and v["belief"] != "G") or (v["vote"] == "NG" and v["belief"] == "G")
		out.append(c)
	return out


static func doubted_claims(game: Dictionary) -> Array:
	var out := []
	for id in game.heard:
		if not _truthy(game.struck.get(id)) and game.player.stamps.get(id) == "doubt":
			out.append(id)
	return out


# —— 條件（第三至五天用） ——
# 條件是字串，或字串的陣列（全部成立才算）。寫法見 prototype/case.js 的說明：
#   heard:說法　zoomed:細節　reason:理由　flag:名字　flag:名字=值1|值2
#   stamp:說法=trust|doubt（who 的有效印章，who 預設是你）　verdict:G|NG|A|none（ext.verdict，沒有裁決是 none）
#   voted:G（你最後一票）　day:1|2|3　out:離開審判的原因　dismissed:陪審員　said:評議室的插話（這一局說過）
#   jurors:說法=doubt>=3（還在評議室的陪審員，有多少個這樣看）　tally:G>=4（最近一次表決的票數）
#   not:條件　any:條件;條件;條件
# ctx 可以帶 {"day": 天} 蓋過 game.day（結局用）。不認得的條件：報錯，當作不成立。
static func cond(game: Dictionary, expr: Variant, who := "you", ctx := {}) -> bool:
	if expr == null:
		return true
	if typeof(expr) == TYPE_ARRAY:
		for e in expr:
			if not cond(game, e, who, ctx):
				return false
		return true
	var text := str(expr).strip_edges()
	if text.begins_with("not:"):
		return not cond(game, text.substr(4), who, ctx)
	if text.begins_with("any:"):
		for part in text.substr(4).split(";"):
			if part.strip_edges() != "" and cond(game, part, who, ctx):
				return true
		return false
	var at := text.find(":")
	if at < 0:
		push_error("不認得的條件：%s" % text)
		return false
	var name := text.substr(0, at)
	var arg := text.substr(at + 1)
	var ext: Dictionary = game.ext
	match name:
		"heard":
			return game.heard.has(arg)
		"zoomed":
			return _truthy(game.zoomed.get(arg))
		"reason":
			return game.player.reasons.has(arg)
		"flag":
			var eq_at := arg.find("=")
			if eq_at < 0:
				return _truthy(ext.flags.get(arg))
			var have: Variant = ext.flags.get(arg.substr(0, eq_at))
			return have != null and arg.substr(eq_at + 1).split("|").has(str(have))
		"stamp":
			var eq_at := arg.find("=")
			if eq_at < 0:
				push_error("不認得的條件：%s" % text)
				return false
			var s: Variant = effective(game, who, arg.substr(0, eq_at))
			return s != null and str(s) == arg.substr(eq_at + 1)
		"verdict":
			var v: Variant = ext.verdict
			return arg.split("|").has("none" if v == null else str(v))
		"voted":
			if game.player.votes.is_empty():
				return false
			return arg.split("|").has(str(game.player.votes[-1]["vote"]))
		"day":
			var today := int(ctx.get("day", game.day))
			for d in arg.split("|"):
				if int(d) == today:
					return true
			return false
		"out":
			return ext.out != null and str(ext.out) == arg
		"dismissed":
			return ext.dismissed.has(arg)
		"said":
			return ext.said.has(arg)
		"jurors":
			var ge_at := arg.find(">=")
			var eq_at := arg.find("=")
			if ge_at < 0 or eq_at < 0 or eq_at > ge_at:
				push_error("不認得的條件：%s" % text)
				return false
			var claim_id := arg.substr(0, eq_at)
			var want := arg.substr(eq_at + 1, ge_at - eq_at - 1)
			var count := 0
			for jid in active_jurors(game):
				var s2: Variant = effective(game, jid, claim_id)
				if s2 != null and str(s2) == want:
					count += 1
			return count >= int(arg.substr(ge_at + 2))
		"tally":
			var ge_at := arg.find(">=")
			if ge_at < 0:
				push_error("不認得的條件：%s" % text)
				return false
			var have_n := 0
			if game.lastResult != null:
				have_n = int(game.lastResult["tally"].get(arg.substr(0, ge_at), 0))
			return have_n >= int(arg.substr(ge_at + 2))
	push_error("不認得的條件：%s" % text)
	return false


# 對白（beats）照 when 篩一遍，複製一份並拿掉 when，原來的資料不動。
static func _filter_beats(game: Dictionary, beats: Array, ctx := {}) -> Array:
	var out := []
	for b in beats:
		if b.has("when") and not cond(game, b["when"], "you", ctx):
			continue
		var c: Dictionary = b.duplicate(true)
		c.erase("when")
		out.append(c)
	return out


# —— 早晨 ——

# 早晨的對白：先是前一天被解除職務的陪審員（法官宣布），再是 MORNINGS；{G}、{NG}、{U} 換成昨天的票數。
static func morning_beats(game: Dictionary, day: int) -> Array:
	var out := []
	var dismissal: Dictionary = CaseData.table("DISMISSAL")
	for jid in CaseData.table("AI_IDS"):
		if game.ext.dismissed.has(jid) and int(game.ext.dismissed[jid]) == day and dismissal.has(jid):
			out.append_array(_filter_beats(game, dismissal[jid]))
	var morning: Variant = CaseData.table("MORNINGS").get(str(day))
	if morning == null:
		return out
	var tally := {}
	if game.lastResult != null:
		tally = game.lastResult["tally"]
	for b in _filter_beats(game, morning):
		var text: String = str(b["text"])
		for key in ["G", "NG", "U"]:
			text = text.replace("{%s}" % key, str(int(tally.get(key, 0))))
		b["text"] = text
		out.append(b)
	return out


# —— 提問紙條 ——

# 這個證人退庭前，今天還可以遞的紙條：今天沒用過紙條，而且 needs 成立。
static func slips_for(game: Dictionary, witness_id: String) -> Array:
	var out := []
	if game.ext.slips.has(str(int(game.day))):
		return out
	for s in CaseData.table("SLIPS"):
		if int(s["day"]) != int(game.day) or s["witness"] != witness_id:
			continue
		if s.has("needs") and not cond(game, s["needs"]):
			continue
		out.append(s.duplicate(true))
	return out


# 遞出一張紙條：記下今天用了它，傳回證人的回答。回答裡的 claim 由畫面在那一句用 hear_claim 聽進去。
static func use_slip(game: Dictionary, slip_id: String) -> Array:
	var day_key := str(int(game.day))
	if game.ext.slips.has(day_key):
		push_error("今天已經遞過紙條了：%s" % game.ext.slips[day_key])
		return []
	for s in CaseData.table("SLIPS"):
		if s["id"] != slip_id:
			continue
		if int(s["day"]) != int(game.day):
			push_error("紙條 %s 不是第 %s 天的" % [slip_id, day_key])
			return []
		game.ext.slips[day_key] = slip_id
		return _filter_beats(game, s["answer"])
	push_error("沒有這張紙條：%s" % slip_id)
	return []


# —— 夜晚 ——

# 夜晚的一件事：intro 照 when 篩過，選項照 needs 篩過（只留 id 和字）。
static func night_event(game: Dictionary, night: int) -> Dictionary:
	var ev: Variant = CaseData.table("NIGHT_EVENTS").get(str(night))
	if ev == null:
		return {"intro": [], "prompt": "", "options": []}
	var options := []
	for o in ev["options"]:
		if o.has("needs") and not cond(game, o["needs"]):
			continue
		options.append({"id": o["id"], "text": o["text"]})
	return {"intro": _filter_beats(game, ev["intro"]), "prompt": ev["prompt"], "options": options}


# 你的選擇：flags 記進 ext.flags；有 out 就是你因此離開審判。傳回 {beats, out}。
static func choose_night(game: Dictionary, night: int, option_id: String) -> Dictionary:
	var ev: Variant = CaseData.table("NIGHT_EVENTS").get(str(night))
	if ev != null:
		for o in ev["options"]:
			if o["id"] != option_id:
				continue
			if o.has("needs") and not cond(game, o["needs"]):
				push_error("第 %d 晚的選項 %s 現在不能選" % [night, option_id])
				return {"beats": [], "out": null}
			var flags: Dictionary = _or(o.get("flags"), {})
			for k in flags:
				game.ext.flags[k] = flags[k]
			var out: Variant = o.get("out")
			if out != null:
				game.ext.out = out
			return {"beats": _filter_beats(game, o["beats"]), "out": out}
	push_error("第 %d 晚沒有選項 %s" % [night, option_id])
	return {"beats": [], "out": null}


# —— 離開審判之後 ——

# 你離開審判，餘下的陪審員照樣審下去：在一份複本上把剩下的日子演完，只數陪審員的票（五票）。
# 起點：今天的表決已經投過（你是在夜晚離開的），就從明天起；否則從今天起（今天的證詞聽一遍，已聽過的不重複）。
# 每天：start_day、hear_day（法官的話、全部證人的說法和證物、結案陳詞），然後 start_room 和表決。
# 簡化：你不在，所以不會遞紙條、不會出示理由；沒有延長評議，第五天仍沒有五票就是沒有裁決（null）。
# 傳回 {verdict: "G"|"NG"|"A"|null, day: 裁決的那一天}；沒有裁決時 day 是 5。
static func continue_without_you(game: Dictionary) -> Dictionary:
	var sim: Dictionary = game.duplicate(true)
	sim.ext.out = _or(sim.ext.out, "away")
	var first := int(game.day)
	if _voted_today(game):
		first += 1
	for day in range(first, CaseData.table("DAYS").size() + 1):
		hear_day(sim, day)
		start_room(sim)
		var result := vote(sim, "U")
		if result["verdict"] != null:
			return {"verdict": result["verdict"], "day": day}
	return {"verdict": null, "day": CaseData.table("DAYS").size()}


# 今天的表決是不是已經投過。
static func _voted_today(game: Dictionary) -> bool:
	var room: Variant = game.room
	if room != null and int(room["day"]) == int(game.day) and room["result"] != null:
		return true
	var votes: Array = game.player.votes
	return votes.size() > 0 and int(votes[-1]["day"]) == int(game.day)


# 把某一天的庭審照劇本播完（測試和 continue_without_you 用，畫面自己逐句播）：
# 開庭時法官的話（剔除說法、剔除證物、規則）、全部證人的說法和證物、結案陳詞。
# 被剔除的說法，你的印章也變成「不予採納」。
static func hear_day(game: Dictionary, day: int) -> void:
	start_day(game, day)
	var d: Dictionary = CaseData.table("DAYS")[day - 1]
	for beat in d.get("open", []):
		_apply_beat(game, beat)
	var witnesses: Dictionary = CaseData.table("WITNESSES")
	for wid in d["witnesses"]:
		for beat in witnesses[wid]["script"]:
			if beat.has("claim"):
				hear_claim(game, beat["claim"])
			if beat.has("exhibit"):
				add_exhibit(game, beat["exhibit"])
			_apply_beat(game, beat)
	for beat in d.get("closing", []):
		_apply_beat(game, beat)


# 一句對白帶來的規則變化：剔除說法、剔除證物、新規則。
static func _apply_beat(game: Dictionary, beat: Dictionary) -> void:
	if beat.has("strike"):
		strike_claim(game, beat["strike"])
		set_player_stamp(game, beat["strike"], "struck")
	if beat.has("strikeExhibit"):
		strike_exhibit(game, beat["strikeExhibit"])
	if beat.has("rule"):
		add_rule(game, beat["rule"])


# —— 結局 ——

const RESULT_TEXT := {
	"G": "被告謀殺罪成",
	"NG": "被告謀殺罪名不成立",
	"A": "謀殺罪不成立、縱火罪成立",
}


# 結局：verdict 是最後一次表決的裁決（沒有就是 null，寫成 ext.verdict = "none"），day 是裁決的那一天。
# 由上而下第一個條件成立的結局；對白是它的 beats，後面接上夾萬（SAFE）。
# 離開審判的結局（out）在最前面，不看 verdict；但夾萬的玉鐲要看被告有沒有獲釋，
# 所以畫面可以把 continue_without_you 的 verdict 傳進來。
# {RESULT} 一律換成「你離開之後，餘下的人」的裁決（continue_without_you）。傳回 {id, title, beats}。
static func ending_of(game: Dictionary, verdict: Variant, day: int) -> Dictionary:
	var ext: Dictionary = game.ext
	var without: Dictionary = {}
	ext.verdict = "none" if verdict == null else verdict
	var ctx := {"day": day}
	var picked: Dictionary = {}
	for e in CaseData.table("ENDINGS"):
		if cond(game, e["when"], "you", ctx):
			picked = e
			break
	if picked.is_empty():
		push_error("沒有符合的結局：verdict=%s day=%d" % [str(ext.verdict), day])
		return {"id": "", "title": "", "beats": []}
	var beats := _filter_beats(game, picked["beats"], ctx)
	beats.append_array(_filter_beats(game, CaseData.table("SAFE"), ctx))
	for b in beats:
		if str(b["text"]).contains("{RESULT}"):
			if without.is_empty():
				without = continue_without_you(game)
			b["text"] = str(b["text"]).replace("{RESULT}", RESULT_TEXT.get(without["verdict"], "未能達成裁決"))
	return {"id": picked["id"], "title": picked["title"], "beats": beats}
