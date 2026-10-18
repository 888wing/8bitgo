# 規則引擎：只處理狀態，不碰畫面。畫面、測試和模擬都直接用它。
# 由 prototype/engine.js 移植，函數名改成 snake_case，行為逐項對照（tests/test_rules_trace.gd 會驗證）。
# 狀態是一個 Dictionary，鍵名和 JS 的 game 物件一樣；事件是 Dictionary 組成的 Array。
# 用法：const Rules := preload("res://scripts/rules/rules.gd")，然後 Rules.create_game()。
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
		if s == "trust":
			trust += 1
		elif s == "doubt":
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


static func ai_vote(game: Dictionary, id: String) -> String:
	var belief := belief_of(game, id)
	var style: Variant = CaseData.table("JURORS")[id].get("vote")
	if style == "guilty":
		return "G"
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


static func start_room(game: Dictionary) -> Array:
	var room_def: Dictionary = CaseData.table("ROOMS")[str(int(game.day))]
	var board := []
	for id in room_def["board"]:
		if game.heard.has(id) and not _truthy(game.struck.get(id)):
			board.append(id)
	game.room = {
		"day": game.day,
		"board": board,
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
		events.append_array(_say(game, st))
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
			for other in CaseData.table("AI_IDS"):
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
		for jid in CaseData.table("AI_IDS"):
			var flips := _contagion(game, jid)
			if flips.size() > 0:
				changed = true
				events.append_array(flips)
				events.append(_line(jid, _or(jurors[jid].get("contagion"), "……")))
		for jid in CaseData.table("AI_IDS"):
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
	for it in CaseData.table("ROOMS")[str(int(game.day))]["interjections"]:
		if _truthy(game.room.fired.get(it["id"])) or not _trigger(it["when"], game, act):
			continue
		game.room.fired[it["id"]] = true
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
		for b in callout[st["id"]]:
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


static func vote(game: Dictionary, player_vote: String) -> Dictionary:
	var ballots := []
	for id in CaseData.table("AI_IDS"):
		ballots.append({"who": id, "vote": ai_vote(game, id)})
	ballots.append({"who": "you", "vote": player_vote})
	_shuffle(ballots, game)
	var tally := {"G": 0, "NG": 0, "U": 0}
	for b in ballots:
		tally[b["vote"]] += 1
	var verdict: Variant = null
	if tally["G"] >= 5:
		verdict = "G"
	elif tally["NG"] >= 5:
		verdict = "NG"
	game.player.votes.append({"day": game.day, "vote": player_vote, "belief": belief_of(game, "you")})
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
