# 第三至五天的規則：每一條新規則一個測試。第一、二天的行為由 test_rules.gd 和 test_rules_trace.gd 管。
# 新增的狀態都在 game.ext（見 rules.gd 的 _new_ext）。
extends "res://tests/suite.gd"

const Rules := preload("res://scripts/rules/rules.gd")
const CaseData := preload("res://scripts/rules/case_data.gd")


# 把前面每一天的證詞都聽完，停在第 day 天（還沒開評議室）。
func _game_on(day: int, seed_value := 1) -> Dictionary:
	var game := Rules.create_game({"seed": seed_value})
	for d in range(1, day + 1):
		Rules.hear_day(game, d)
	return game


# 直接把某個陪審員改成「投有罪」：信控方的說法，疑辯方的說法（against）。
func _make_guilty(game: Dictionary, jid: String) -> void:
	var claims: Dictionary = CaseData.table("CLAIMS")
	for id in game.heard:
		game.jurors[jid].stamps[id] = "doubt" if claims[id].get("against", false) else "trust"


func _texts(beats: Array) -> Array:
	var out := []
	for b in beats:
		out.append(b["text"])
	return out


func _has_text(beats: Array, needle: String) -> bool:
	for b in beats:
		if str(b["text"]).contains(needle):
			return true
	return false


func _who_list(result: Dictionary) -> Array:
	var out := []
	for b in result.ballots:
		out.append(b["who"])
	return out


func test_ext_created() -> void:
	about("新增的狀態全放在 game.ext，一開始都是空的")
	var game := Rules.create_game()
	eq(game.ext, {
		"struck_exhibits": {}, "dismissed": {}, "exposed": {}, "flags": {}, "slips": {},
		"final": false, "session": 0, "out": null, "verdict": null,
	})


func test_against_link() -> void:
	about("辯方的說法（against）：信它，那一環存疑；疑它，那一環不受影響")
	var game := Rules.create_game()
	Rules.hear_claim(game, "c1")
	Rules.hear_claim(game, "q3")
	Rules.set_player_stamp(game, "c1", "trust")
	eq(Rules.link_status(game, "you", "ignition"), "est")
	Rules.set_player_stamp(game, "q3", "trust")
	eq(Rules.link_status(game, "you", "ignition"), "unknown", "信 c1、信 q3：一信一疑")
	Rules.set_player_stamp(game, "c1", null)
	eq(Rules.link_status(game, "you", "ignition"), "doubt", "只信 q3：起火存疑")
	Rules.set_player_stamp(game, "q3", "doubt")
	Rules.set_player_stamp(game, "c1", "trust")
	eq(Rules.link_status(game, "you", "ignition"), "est", "疑 q3 等於沒有說")
	Rules.set_player_stamp(game, "c1", "doubt")
	eq(Rules.link_status(game, "you", "ignition"), "doubt")
	Rules.set_player_stamp(game, "q3", "trust")
	eq(Rules.link_status(game, "you", "ignition"), "doubt")
	# 在場那一環：李志健的 l2（一點四十才離開）也是 against
	Rules.hear_claim(game, "g1")
	Rules.hear_claim(game, "l2")
	Rules.set_player_stamp(game, "g1", "trust")
	Rules.set_player_stamp(game, "l2", "doubt")
	eq(Rules.link_status(game, "you", "presence"), "est")
	Rules.set_player_stamp(game, "l2", "trust")
	eq(Rules.link_status(game, "you", "presence"), "unknown")
	# 陪審員一樣：梁伯信 q3，黃老闆疑 q3
	var solo := Rules.create_game()
	Rules.hear_claim(solo, "q3")
	eq(Rules.link_status(solo, "leung", "ignition"), "doubt")
	eq(Rules.belief_of(solo, "leung"), "NG", "一個必要的環存疑就是無罪")
	eq(Rules.link_status(solo, "wong", "ignition"), "unknown")


func test_strike_exhibit() -> void:
	about("法官剔除證物：以它推出去的理由不能再用，其他的照舊")
	var game := Rules.create_game()
	Rules.hear_day(game, 1)
	Rules.zoom(game, "P4")
	Rules.zoom(game, "P2")
	eq(Rules.cross_check(game, "c3", "P4b").reason, "R1")
	eq(Rules.cross_check(game, "c2", "P2b").reason, "R2")
	var cards: Array = Rules.cards(game)
	eq(cards.size(), 2)
	eq(cards[0].card, "P4")
	Rules.hear_day(game, 2)
	Rules.hear_day(game, 3)
	eq(game.ext.struck_exhibits, {"P4": true})
	cards = Rules.cards(game)
	eq(cards.size(), 1)
	eq(cards[0].card, "P2")
	check(game.player.reasons.has("R1"), "理由還在筆記上，只是不能出示")
	eq(game.player.stamps.c3, "struck")
	eq(Rules.effective(game, "leung", "c3"), null)
	var other := Rules.create_game()
	Rules.strike_exhibit(other, "P2")
	eq(other.ext.struck_exhibits, {"P2": true})


func test_hear_day() -> void:
	about("hear_day：開庭的話、證人的說法和證物、結案陳詞，一次播完")
	var game := Rules.create_game()
	Rules.hear_day(game, 2)
	check(game.heard.has("w1") and game.heard.has("k1"))
	check(game.exhibits.has("D1") and game.exhibits.has("P3"))
	check(game.rules.has("r5"), "法官的反對有效帶來 r5")
	eq(game.struck.h1, true)
	eq(game.player.stamps.h1, "struck")
	eq(game.day, 2)
	eq(game.ext.final, false)
	Rules.hear_day(game, 3)
	eq(game.struck.c3, true)
	eq(game.ext.struck_exhibits.P4, true)
	check(game.heard.has("f3") and game.exhibits.has("P5"))
	Rules.hear_day(game, 5)
	eq(game.ext.final, true)
	check(game.rules.has("r6") and game.rules.has("r7"), "結案陳詞帶來 r6、r7")
	check(game.heard.has("d3") and game.exhibits.has("P7"))
	check(not game.heard.has("d4"), "d4 要問紙條才有")
	eq(game.room, null, "hear_day 不開評議室")


func test_start_day() -> void:
	about("開庭：換日子、最後一天沒有未決、被揭發的人隔天解除職務")
	var game := Rules.create_game()
	game.ext.exposed["law"] = 3
	game.ext.session = 2
	Rules.start_day(game, 3)
	eq(game.day, 3)
	eq(game.ext.final, false)
	eq(game.ext.session, 0, "新的一天，延長評議從頭算")
	eq(game.ext.exposed, {"law": 3}, "同一天還沒有解除")
	eq(game.ext.dismissed, {})
	Rules.start_day(game, 4)
	eq(game.ext.dismissed, {"law": 4})
	eq(game.ext.exposed, {})
	Rules.start_day(game, 5)
	eq(game.ext.final, true)
	Rules.start_day(game, 5)
	eq(game.ext.dismissed, {"law": 4}, "重複呼叫不會改日子")
	Rules.start_day(game, 4)
	eq(game.ext.final, false)


func test_active_jurors() -> void:
	about("還在評議室的陪審員：六位減去解除職務的")
	var game := Rules.create_game()
	eq(Rules.active_jurors(game), ["leung", "wong", "law", "lam", "so", "fung"])
	game.ext.dismissed["law"] = 4
	eq(Rules.active_jurors(game), ["leung", "wong", "lam", "so", "fung"])


func test_final_day_no_undecided() -> void:
	about("最後一天沒有未決：陪審員不再投未決，你投未決當作無罪")
	var game := _game_on(1)
	Rules.start_room(game)
	eq(Rules.ai_vote(game, "fung"), "U", "第一天馮 Sir 未決")
	game.ext.final = true
	eq(Rules.ai_vote(game, "fung"), "NG", "未決的人投無罪")
	game.jurors.wong.stamps = {}
	eq(Rules.belief_of(game, "wong"), "U")
	eq(Rules.ai_vote(game, "wong"), "G", "急性子的人未決就投有罪")
	eq(Rules.ai_vote(game, "law"), "G", "羅生永遠有罪")
	var result := Rules.vote(game, "U")
	eq(result.tally.U, 0)
	eq(game.player.votes[-1].vote, "NG", "記下來的是實際的一票")
	var you := {}
	for b in result.ballots:
		if b["who"] == "you":
			you = b
	eq(you.vote, "NG")
	# 不是最後一天，未決照舊
	var normal := _game_on(1)
	Rules.start_room(normal)
	eq(Rules.vote(normal, "U").tally.U, 2)


func test_alternative_available() -> void:
	about("替代罪名：最後一天而且法官講過 r7，表決才有 A")
	var game := _game_on(1)
	Rules.start_room(game)
	eq(Rules.alt_available(game), false)
	eq(Rules.vote(game, "U").tally.keys(), ["G", "NG", "U"], "平常的日子只有三個鍵")
	game.ext.final = true
	eq(Rules.alt_available(game), false, "最後一天但法官還沒說")
	eq(Rules.vote(game, "NG").tally.keys(), ["G", "NG", "U"])
	Rules.add_rule(game, "r7")
	eq(Rules.alt_available(game), true)
	eq(Rules.vote(game, "NG").tally.keys(), ["G", "NG", "U", "A"])
	game.ext.final = false
	eq(Rules.alt_available(game), false, "有 r7 但不是最後一天")


func test_alt_belief_and_votes() -> void:
	about("替代罪名：信有另一個起火點、又信他在地下點過火的人，投縱火罪成立")
	var game := _game_on(5)
	Rules.hear_claim(game, "q3")
	Rules.hear_claim(game, "d4")
	for jid in ["leung", "lam", "so", "fung"]:
		for id in ["c1", "c2", "q1"]:
			game.jurors[jid].stamps[id] = "doubt"
	eq(Rules.alt_available(game), true)
	eq(Rules.belief_of(game, "leung"), "NG")
	eq(Rules.alt_belief(game, "leung"), true, "q3 信、d3 疑")
	eq(Rules.alt_belief(game, "lam"), true, "q3 信、d4 信")
	eq(Rules.alt_belief(game, "so"), true)
	eq(Rules.alt_belief(game, "fung"), true)
	eq(Rules.alt_belief(game, "wong"), false, "黃老闆疑 q3")
	for jid in ["leung", "lam", "so", "fung"]:
		eq(Rules.ai_vote(game, jid), "A", jid)
	eq(Rules.ai_vote(game, "wong"), "G")
	eq(Rules.ai_vote(game, "law"), "G")
	var result := Rules.vote(game, "A")
	eq(result.tally, {"G": 2, "NG": 0, "U": 0, "A": 5})
	eq(result.verdict, "A")
	# 你自己的印章
	eq(Rules.alt_belief(game, "you"), false, "還沒蓋章")
	Rules.set_player_stamp(game, "q3", "trust")
	eq(Rules.alt_belief(game, "you"), false)
	Rules.set_player_stamp(game, "d4", "trust")
	eq(Rules.alt_belief(game, "you"), true)
	Rules.set_player_stamp(game, "d4", "doubt")
	Rules.set_player_stamp(game, "d3", "doubt")
	eq(Rules.alt_belief(game, "you"), true, "不信他即刻上樓也可以")
	Rules.set_player_stamp(game, "q3", "doubt")
	eq(Rules.alt_belief(game, "you"), false)
	# 肯定是謀殺的人投有罪：梁伯信控方的每一句，也信 q3，起火三信一疑仍然成立；alt_belief 成立，但信念是有罪
	var guilty := _game_on(5)
	Rules.hear_claim(guilty, "q3")
	_make_guilty(guilty, "leung")
	guilty.jurors.leung.stamps["q3"] = "trust"
	eq(Rules.link_status(guilty, "leung", "ignition"), "est", "c1、c2、q1 三信，q3 一疑")
	eq(Rules.belief_of(guilty, "leung"), "G")
	eq(Rules.alt_belief(guilty, "leung"), true)
	eq(Rules.ai_vote(guilty, "leung"), "G", "信念是有罪的人不會改投 A")
	# r7 之前：同一批人只是投無罪
	game.rules.erase("r7")
	eq(Rules.ai_vote(game, "leung"), "NG")
	eq(Rules.vote(game, "NG").tally.has("A"), false)


func test_vote_after_leaving() -> void:
	about("你離開審判之後，表決只有陪審員的票，也不記你的一票")
	var game := _game_on(2)
	Rules.start_room(game)
	game.ext.out = "dismissed"
	var result := Rules.vote(game, "G")
	eq(result.ballots.size(), 6)
	eq(_who_list(result).has("you"), false)
	eq(result.tally.G + result.tally.NG + result.tally.U, 6)
	eq(game.player.votes, [], "你沒有投票")
	# 最後一天也不會因為「你」的未決而報錯
	var final := _game_on(5)
	final.ext.out = "bangle"
	Rules.start_room(final)
	var last := Rules.vote(final, "U")
	eq(last.ballots.size(), 6)
	eq(last.tally.U, 0)
	# 五票要的是陪審員自己的五票
	for jid in ["leung", "wong", "lam", "so"]:
		_make_guilty(final, jid)
	eq(Rules.vote(final, "U").verdict, "G", "梁、黃、羅、蘇、林五票")


func test_vote_a_invalid_without_alt() -> void:
	about("沒有替代罪名的時候投 A，當作投無罪")
	var game := _game_on(1)
	Rules.start_room(game)
	var result := Rules.vote(game, "A")
	eq(game.player.votes[-1].vote, "NG")
	eq(result.tally.has("A"), false)


func test_exposed_law_dismissed() -> void:
	about("第三天指出羅生失言：第四天他被解除職務，六人之中仍然要五票")
	var game := _game_on(2)
	Rules.hear_day(game, 3)
	Rules.start_room(game)
	Rules.ask(game, "lam")
	Rules.ask(game, "so")
	check(game.room.fired.has("d3-slip"), "第二次發言之後羅生失言")
	Rules.call_out(game, "d3-slip")
	eq(game.ext.exposed, {"law": 3})
	eq(game.ext.dismissed, {})
	eq(Rules.active_jurors(game).size(), 6)
	var day3 := Rules.vote(game, "U")
	eq(day3.ballots.size(), 7, "同一天羅生還有票")
	Rules.start_day(game, 4)
	eq(game.ext.dismissed, {"law": 4})
	eq(Rules.active_jurors(game), ["leung", "wong", "lam", "so", "fung"])
	Rules.hear_day(game, 4)
	var events := Rules.start_room(game)
	for e in events:
		check(e.get("who") != "law" and e.get("juror") != "law", "羅生沒有開場發言")
	for st in game.room.statements:
		check(st["juror"] != "law")
	eq(game.room.statements.size(), 5)
	Rules.ask(game, "lam")
	Rules.ask(game, "so")
	Rules.ask(game, "fung")
	eq(game.room.fired.keys(), [], "羅生不在，沒有人失言")
	eq(game.room.over, true)
	# 六張票
	var result := Rules.vote(game, "NG")
	eq(result.ballots.size(), 6)
	eq(_who_list(result).has("law"), false)
	eq(_who_list(result).has("you"), true)
	# 五票才是裁決：六人裡的四票不夠；五票就夠，即使你反對
	_make_guilty(game, "lam")
	var four := game.duplicate(true)
	eq(Rules.vote(four, "NG").verdict, null, "四票有罪、你無罪：六人裡的四票不是裁決")
	eq(Rules.vote(four, "G").verdict, "G", "你也投有罪，五票")
	_make_guilty(game, "fung")
	var five := Rules.vote(game, "NG")
	eq(five.tally.G, 5)
	eq(five.verdict, "G", "五個陪審員有罪，你反對也沒有用")


func test_settle_skips_dismissed() -> void:
	about("解除職務的人不再被傳染、不再跟大隊，也不算在別人眼中的大隊裡")
	# 傳染：黃老闆疑被告的三句，被告的第四句（d4）他也會疑；他不在了，d4 就留在「信」
	var game := _game_on(5)
	Rules.hear_claim(game, "d4")
	game.ext.dismissed["wong"] = 5
	Rules.start_room(game)
	Rules.ask(game, "lam")
	eq(game.jurors.wong.stamps.d4, "trust", "解除職務的人不再被傳染")
	eq(game.jurors.leung.stamps.d4, "doubt", "還在的梁伯照樣被傳染")
	var stay := _game_on(5)
	Rules.hear_claim(stay, "d4")
	Rules.start_room(stay)
	Rules.ask(stay, "lam")
	eq(stay.jurors.wong.stamps.d4, "doubt", "沒有解除職務就會")
	# 跟大隊：蘇太要四個人疑才跟。你、梁伯、林小姐加上已經離開的羅生是四個，羅生不算，她就不跟
	var conform := _game_on(3)
	Rules.start_room(conform)
	for jid in ["leung", "lam", "law"]:
		conform.jurors[jid].stamps["c1"] = "doubt"
		conform.jurors[jid].revealed["c1"] = true
	Rules.set_player_stamp(conform, "c1", "doubt")
	conform.ext.dismissed["law"] = 3
	Rules.ask(conform, "wong")
	eq(conform.jurors.so.stamps.c1, "trust", "離開的人不算")
	var counted := _game_on(3)
	Rules.start_room(counted)
	for jid in ["leung", "lam", "law"]:
		counted.jurors[jid].stamps["c1"] = "doubt"
		counted.jurors[jid].revealed["c1"] = true
	Rules.set_player_stamp(counted, "c1", "doubt")
	Rules.ask(counted, "wong")
	eq(counted.jurors.so.stamps.c1, "doubt", "羅生還在就算：四個人")


func test_dismissed_only_after_exposure() -> void:
	about("指錯了，或者指的不是失言，沒有人被揭發")
	var game := _game_on(2)
	Rules.hear_day(game, 3)
	Rules.start_room(game)
	Rules.call_out(game, "d3-leung")
	eq(game.ext.exposed, {}, "梁伯那句話沒有問題")
	Rules.call_out(game, "nothing")
	eq(game.ext.exposed, {}, "沒有這句話")
	check(game.room.fired.has("d3-slip"), "第二次發言之後羅生失言")
	Rules.call_out(game, "d3-slip")
	eq(game.ext.exposed, {"law": 3})
	# 第二天的失言沒有 expose
	var day2 := _game_on(2)
	Rules.start_room(day2)
	Rules.ask(day2, "lam")
	Rules.ask(day2, "so")
	check(day2.room.fired.has("d2-slip"))
	Rules.call_out(day2, "d2-slip")
	eq(day2.ext.exposed, {})
	# 第四天再失言：第五天才解除
	var day4 := _game_on(4)
	Rules.start_room(day4)
	Rules.ask(day4, "lam")
	Rules.ask(day4, "so")
	check(day4.room.fired.has("d4-slip"))
	Rules.call_out(day4, "d4-slip")
	eq(day4.ext.exposed, {"law": 4})
	Rules.start_day(day4, 5)
	eq(day4.ext.dismissed, {"law": 5})


func test_extension_sessions() -> void:
	about("最後一天沒有五票：延長評議兩節，每節兩個動作，之後無法裁決")
	var game := _game_on(5)
	Rules.start_room(game)
	Rules.ask(game, "lam")
	check(game.jurors.lam.revealed.has("q1") or game.jurors.lam.revealed.has("l2"))
	var board_before: Array = game.room.board.duplicate()
	var result := Rules.vote(game, "NG")
	eq(result.verdict, null, "四票有罪、三票無罪")
	eq(result.tally, {"G": 4, "NG": 3, "U": 0, "A": 0})
	var events := Rules.start_extension(game)
	eq(game.ext.session, 1)
	eq(game.room.session, 1)
	eq(game.room.actions, 2)
	eq(game.room.over, false)
	eq(game.room.statements, [], "沒有開場發言")
	eq(game.room.board, board_before, "黑板照舊")
	var intro: Array = CaseData.table("ROOMS")["5"]["extension"]
	eq(events.size(), intro.size())
	eq(events[0].text, intro[0].text)
	eq(events[1].who, "leung")
	check(game.jurors.lam.revealed.has("l2") or game.jurors.lam.revealed.has("q1"), "翻開了的格子不收回")
	Rules.ask(game, "so")
	eq(game.room.over, false)
	Rules.present(game, "P7", "so")
	eq(game.room.over, true, "兩個動作就夠鐘")
	eq(Rules.clock_label(game), "下午四時半")
	eq(Rules.vote(game, "NG").verdict, null)
	Rules.start_extension(game)
	eq(game.ext.session, 2)
	eq(game.room.session, 2)
	eq(game.room.actions, 2)
	eq(Rules.vote(game, "NG").verdict, null, "第二節仍然沒有五票：畫面接上 ending_of(null)")
	eq(Rules.start_extension(game), [], "最多兩節")
	eq(game.ext.session, 2)
	Rules.start_day(game, 5)
	eq(game.ext.session, 0)
	# 一般的評議室沒有 session 這個鍵
	var normal := _game_on(1)
	Rules.start_room(normal)
	eq(normal.room.has("session"), false)


func test_extension_needs_final_day() -> void:
	about("不是最後一天，不能延長評議")
	var game := _game_on(2)
	Rules.start_room(game)
	eq(Rules.start_extension(game), [])
	eq(game.ext.session, 0)
	eq(game.room.actions, 3, "評議室原封不動")


func test_cond_predicates() -> void:
	about("條件：每一種寫法")
	var game := _game_on(2)
	game.zoomed["P2b"] = true
	game.player.reasons.append("R2")
	game.ext.flags["bangle"] = "kept"
	game.ext.flags["jade"] = "fair"
	Rules.set_player_stamp(game, "c1", "trust")
	Rules.set_player_stamp(game, "c2", "doubt")
	Rules.set_player_stamp(game, "h1", "struck")
	# heard
	check(Rules.cond(game, "heard:c1"))
	check(not Rules.cond(game, "heard:q3"))
	# zoomed
	check(Rules.cond(game, "zoomed:P2b"))
	check(not Rules.cond(game, "zoomed:P1b"))
	# reason
	check(Rules.cond(game, "reason:R2"))
	check(not Rules.cond(game, "reason:R1"))
	# flag
	check(Rules.cond(game, "flag:bangle"))
	check(not Rules.cond(game, "flag:press"))
	check(Rules.cond(game, "flag:bangle=kept"))
	check(Rules.cond(game, "flag:bangle=reported|kept"))
	check(not Rules.cond(game, "flag:bangle=reported|refused"))
	check(not Rules.cond(game, "flag:press=told"))
	check(Rules.cond(game, "flag:jade=fair|generous"))
	# stamp：你的印章，或者指定的陪審員
	check(Rules.cond(game, "stamp:c1=trust"))
	check(not Rules.cond(game, "stamp:c1=doubt"))
	check(Rules.cond(game, "stamp:c2=doubt"))
	check(not Rules.cond(game, "stamp:q3=trust"), "沒聽過的說法沒有印章")
	check(not Rules.cond(game, "stamp:h1=trust"), "被剔除的說法沒有印章")
	check(Rules.cond(game, "stamp:c1=trust", "leung"))
	check(Rules.cond(game, "stamp:c1=doubt", "lam"))
	check(not Rules.cond(game, "stamp:c1=trust", "lam"))
	# verdict：沒有裁決是 none
	check(Rules.cond(game, "verdict:none"))
	check(not Rules.cond(game, "verdict:G|NG"))
	game.ext.verdict = "NG"
	check(Rules.cond(game, "verdict:NG"))
	check(Rules.cond(game, "verdict:G|NG"))
	check(not Rules.cond(game, "verdict:G"))
	check(not Rules.cond(game, "verdict:none"))
	# voted：最後一票
	check(not Rules.cond(game, "voted:G"), "還沒有投過")
	game.player.votes.append({"day": 1, "vote": "NG", "belief": "U"})
	game.player.votes.append({"day": 2, "vote": "G", "belief": "U"})
	check(Rules.cond(game, "voted:G"))
	check(not Rules.cond(game, "voted:NG"), "只看最後一票")
	# day
	check(Rules.cond(game, "day:2"))
	check(Rules.cond(game, "day:1|2|3"))
	check(not Rules.cond(game, "day:4|5"))
	check(Rules.cond(game, "day:5", "you", {"day": 5}), "ctx 的日子蓋過 game.day")
	check(not Rules.cond(game, "day:2", "you", {"day": 5}))
	# out
	check(not Rules.cond(game, "out:bangle"))
	game.ext.out = "bangle"
	check(Rules.cond(game, "out:bangle"))
	check(not Rules.cond(game, "out:mistrial"))
	# dismissed
	check(not Rules.cond(game, "dismissed:law"))
	game.ext.dismissed["law"] = 4
	check(Rules.cond(game, "dismissed:law"))
	check(not Rules.cond(game, "dismissed:wong"))
	# jurors：還在評議室的人裡，有多少個這樣看
	check(Rules.cond(game, "jurors:c1=doubt>=2"), "林小姐、馮 Sir")
	check(not Rules.cond(game, "jurors:c1=doubt>=3"))
	check(Rules.cond(game, "jurors:c1=trust>=3"))
	check(Rules.cond(game, "jurors:c1=trust>=0"))
	game.ext.dismissed["lam"] = 4
	check(not Rules.cond(game, "jurors:c1=doubt>=2"), "解除職務的人不算")
	check(Rules.cond(game, "jurors:c1=doubt>=1"))
	check(Rules.cond(game, "jurors:g1=trust>=3"), "梁、黃、蘇；馮 Sir 沒有印章")
	check(not Rules.cond(game, "jurors:g1=trust>=4"))
	# tally
	check(not Rules.cond(game, "tally:G>=1"), "還沒有表決")
	game.lastResult = {"tally": {"G": 4, "NG": 1, "U": 2}}
	check(Rules.cond(game, "tally:G>=4"))
	check(not Rules.cond(game, "tally:G>=5"))
	check(Rules.cond(game, "tally:U>=2"))
	check(not Rules.cond(game, "tally:A>=1"), "沒有這個鍵就是 0")
	check(Rules.cond(game, "tally:A>=0"))


func test_cond_combinators() -> void:
	about("條件：not、any、陣列，可以疊在一起")
	var game := _game_on(2)
	game.ext.flags["bangle"] = "kept"
	game.ext.verdict = "A"
	check(Rules.cond(game, "not:heard:q3"))
	check(not Rules.cond(game, "not:heard:c1"))
	check(Rules.cond(game, "not:not:heard:c1"))
	check(Rules.cond(game, "any:heard:q3;heard:c1"))
	check(not Rules.cond(game, "any:heard:q3;heard:q4"))
	check(Rules.cond(game, "any:heard:q3;heard:q4;flag:bangle=kept"))
	check(not Rules.cond(game, "any:not:heard:c1;heard:q3"))
	check(Rules.cond(game, "any:not:heard:c1;not:heard:q3"))
	check(Rules.cond(game, "not:any:heard:q3;heard:q4"))
	check(not Rules.cond(game, "not:any:heard:q3;heard:c1"))
	check(Rules.cond(game, "any:verdict:NG;verdict:A"))
	check(not Rules.cond(game, "not:any:verdict:NG;verdict:A"))
	check(Rules.cond(game, ["heard:c1", "flag:bangle"]))
	check(not Rules.cond(game, ["heard:c1", "heard:q3"]))
	check(Rules.cond(game, ["heard:c1", "any:heard:q3;heard:c2", "not:out:bangle"]))
	check(Rules.cond(game, []), "沒有條件就是成立")
	check(Rules.cond(game, null))
	# case.js 裡真正用到的幾條
	eq(CaseData.table("ALTERNATIVE").when, ["stamp:q3=trust", "any:stamp:d4=trust;stamp:d3=doubt"])
	check(Rules.cond(game, ["flag:bangle=kept", "any:zoomed:P5b;reason:RS"]) == false)
	game.zoomed["P5b"] = true
	check(Rules.cond(game, ["flag:bangle=kept", "any:zoomed:P5b;reason:RS"]))


func test_cond_unknown() -> void:
	about("條件：不認得的寫法報錯（輸出裡的 ERROR 是預期的），當作不成立")
	var game := Rules.create_game()
	check(not Rules.cond(game, "bogus:x"))
	check(not Rules.cond(game, "jurors:g1=doubt"), "少了 >=N")
	check(not Rules.cond(game, ["heard:c1", "bogus:y"]))
	check(not Rules.cond(game, "any:bogus:x;heard:c1"), "any 裡面的不認得，其餘不成立，整句不成立")
	check(Rules.cond(game, "not:bogus:x"), "not 只是把 false 反過來")


func test_morning_tally() -> void:
	about("早晨：報紙上的票數是昨天的表決")
	var game := _game_on(1)
	Rules.start_room(game)
	eq(Rules.morning_beats(game, 1), [], "第一天沒有早晨")
	var blank := Rules.create_game()
	eq(Rules.morning_beats(blank, 2)[1].text, "《霧港日報》：福安樓案陪審團首日暫議　有罪 0 票、無罪 0 票、未決 0 票", "沒有表決，票數當作 0")
	var result := Rules.vote(game, "U")
	var tally: Dictionary = result.tally
	var beats := Rules.morning_beats(game, 2)
	eq(beats.size(), 3, "四句裡兩句是互相排斥的")
	eq(beats[1].text, "《霧港日報》：福安樓案陪審團首日暫議　有罪 %d 票、無罪 %d 票、未決 %d 票" % [tally.G, tally.NG, tally.U])
	for b in beats:
		check(not b.has("when"), "when 要拿掉")
		check(not str(b["text"]).contains("{"), "票數都換了")
	check(_has_text(beats, "殺人填命"), "有罪四票：群情洶湧")
	check(not _has_text(beats, "還我家園"))
	game.lastResult.tally.G = 3
	beats = Rules.morning_beats(game, 2)
	check(_has_text(beats, "還我家園"))
	check(not _has_text(beats, "殺人填命"))
	eq(beats[1].text.contains("有罪 3 票"), true)
	# 資料沒有被改動
	eq(CaseData.table("MORNINGS")["2"][1].text.contains("{G}"), true)
	eq(CaseData.table("MORNINGS")["2"][2].has("when"), true)


func test_morning_press_line() -> void:
	about("早晨：只有你對記者說了評議室的事，報紙才有那一行")
	var game := _game_on(2)
	Rules.start_room(game)
	Rules.vote(game, "U")
	var plain := Rules.morning_beats(game, 3)
	eq(plain.size(), 2)
	check(not _has_text(plain, "獨家"))
	game.ext.flags["press"] = "declared"
	check(not _has_text(Rules.morning_beats(game, 3), "獨家"), "申報利益不是洩密")
	game.ext.flags["press"] = "told"
	var told := Rules.morning_beats(game, 3)
	eq(told.size(), 3)
	check(_has_text(told, "獨家：陪審員透露"))
	check(not told[2].has("when"))


func test_morning_dismissal() -> void:
	about("早晨：被揭發的陪審員被解除職務，法官的宣布排在報紙前面")
	var game := _game_on(2)
	Rules.hear_day(game, 3)
	Rules.start_room(game)
	Rules.ask(game, "lam")
	Rules.ask(game, "so")
	Rules.call_out(game, "d3-slip")
	Rules.vote(game, "U")
	eq(Rules.morning_beats(game, 4).size(), 2, "第四天早上還沒有 start_day，沒有解除")
	Rules.start_day(game, 4)
	var beats := Rules.morning_beats(game, 4)
	eq(beats.size(), 4)
	eq(beats[0].who, "法官")
	check(str(beats[0].text).contains("羅永昌"))
	check(str(beats[1].text).contains("餘下六人"))
	check(str(beats[2].text).contains("第三日暫議"), "接著是報紙")
	check(not beats[0].has("when"))
	Rules.start_day(game, 5)
	eq(Rules.morning_beats(game, 5).size(), 2, "只有解除那天早上才有宣布")
	check(not _has_text(Rules.morning_beats(game, 5), "羅永昌"))


func test_slips() -> void:
	about("提問紙條：每個證人有自己的紙條，條件成立才出現，每天只能遞一張")
	var game := _game_on(1)
	eq(Rules.slips_for(game, "chung").size(), 1)
	eq(Rules.slips_for(game, "chung")[0].id, "s-tv")
	eq(Rules.slips_for(game, "cheng"), [], "鄭督察沒有紙條")
	var beats := Rules.use_slip(game, "s-tv")
	eq(beats.size(), 2)
	eq(beats[1].claim, "g4")
	eq(game.ext.slips, {"1": "s-tv"})
	eq(Rules.slips_for(game, "chung"), [], "今天已經遞過")
	check(not game.heard.has("g4"), "說法由畫面在那一句聽進去")
	Rules.hear_claim(game, "g4")
	# 第二天：屈家輝那張要先聽過 w2；陳金水那張沒有條件。兩張都能選，但只能遞一張
	Rules.hear_day(game, 2)
	eq(Rules.slips_for(game, "wat").size(), 1)
	eq(Rules.slips_for(game, "chan").size(), 1)
	Rules.use_slip(game, "s-forwhom")
	eq(Rules.slips_for(game, "wat"), [])
	eq(Rules.slips_for(game, "chan"), [])
	eq(game.ext.slips, {"1": "s-tv", "2": "s-forwhom"})
	# 條件：沒聽過 w2 就沒有那張
	var early := Rules.create_game()
	early.day = 2
	eq(Rules.slips_for(early, "wat"), [], "needs heard:w2")
	Rules.hear_claim(early, "w2")
	eq(Rules.slips_for(early, "wat")[0].id, "s-pickup")


func test_slips_conditions() -> void:
	about("提問紙條：金鐲那張要先放大驗屍報告的照片，首飾那張還要收下金鐲")
	var game := _game_on(3)
	var ids := []
	for s in Rules.slips_for(game, "man"):
		ids.append(s.id)
	eq(ids, ["s-heater"], "還沒有放大 P5b")
	Rules.reveal_detail(game, "P5b")
	ids = []
	for s in Rules.slips_for(game, "man"):
		ids.append(s.id)
	eq(ids, ["s-heater", "s-bangle"])
	var answer := Rules.use_slip(game, "s-bangle")
	eq(answer[1].claim, "f4")
	eq(Rules.slips_for(game, "man"), [], "每天一張")
	# 第四天：s-jewel 要收下金鐲（flag bangle=kept）而且放大過 P5b；s-second 要放大過 V1a
	Rules.hear_day(game, 4)
	eq(Rules.slips_for(game, "au"), [], "沒有去過現場、沒有收金鐲")
	Rules.add_exhibit(game, "V1")
	Rules.reveal_detail(game, "V1a")
	ids = []
	for s in Rules.slips_for(game, "au"):
		ids.append(s.id)
	eq(ids, ["s-second"])
	game.ext.flags["bangle"] = "refused"
	eq(Rules.slips_for(game, "au").size(), 1, "不收金鐲沒有 s-jewel")
	game.ext.flags["bangle"] = "kept"
	ids = []
	for s in Rules.slips_for(game, "au"):
		ids.append(s.id)
	eq(ids, ["s-second", "s-jewel"])
	var no_zoom := _game_on(4)
	no_zoom.ext.flags["bangle"] = "kept"
	eq(Rules.slips_for(no_zoom, "au"), [], "收了金鐲但沒有放大 P5b")
	# 第五天：放大 P7b，或者有理由 RS
	Rules.hear_day(game, 5)
	eq(Rules.slips_for(game, "ho"), [])
	game.player.reasons.append("RS")
	eq(Rules.slips_for(game, "ho")[0].id, "s-downstairs")
	game.player.reasons.erase("RS")
	game.zoomed["P7b"] = true
	eq(Rules.slips_for(game, "ho")[0].id, "s-downstairs")
	var d4 := Rules.use_slip(game, "s-downstairs")
	eq(d4[2].claim, "d4")


func test_slip_guards() -> void:
	about("提問紙條：同一天不能遞兩張，不是今天的和不存在的也不行")
	var game := _game_on(2)
	eq(Rules.use_slip(game, "s-tv"), [], "第一天的紙條")
	eq(Rules.use_slip(game, "s-nothing"), [])
	eq(game.ext.slips, {})
	check(Rules.use_slip(game, "s-forwhom").size() > 0)
	eq(Rules.use_slip(game, "s-pickup"), [], "今天已經用過一張")
	eq(game.ext.slips, {"2": "s-forwhom"})


func test_night_options() -> void:
	about("夜晚：選項照條件篩，第三晚要看過驗屍報告的照片才可以報警")
	var game := _game_on(3)
	var night := Rules.night_event(game, 3)
	eq(night.prompt, "你怎樣處理這隻金鐲？")
	var ids := []
	for o in night.options:
		ids.append(o.id)
		eq(o.keys(), ["id", "text"])
	eq(ids, ["keep", "refuse"])
	eq(night.intro.size(), 3, "你想起驗屍報告那句要放大過 P5b")
	for b in night.intro:
		check(not b.has("when"))
	Rules.reveal_detail(game, "P5b")
	night = Rules.night_event(game, 3)
	ids = []
	for o in night.options:
		ids.append(o.id)
	eq(ids, ["report", "keep", "refuse"])
	eq(night.intro.size(), 4)
	eq(night.intro[3].who, "你")
	# 其他夜晚的選項沒有條件
	eq(Rules.night_event(game, 1).options.size(), 3)
	eq(Rules.night_event(game, 2).options.size(), 3)
	eq(Rules.night_event(game, 4).options.size(), 3)
	eq(Rules.night_event(game, 9), {"intro": [], "prompt": "", "options": []})
	# 資料沒有被改動
	check(CaseData.table("NIGHT_EVENTS")["3"]["intro"][3].has("when"))


func test_choose_night() -> void:
	about("夜晚的選擇：記下 flags，有 out 就是離開審判")
	var game := _game_on(3)
	var res := Rules.choose_night(game, 1, "generous")
	eq(game.ext.flags, {"jade": "generous"})
	eq(res.out, null)
	eq(res.beats.size(), 2)
	eq(game.ext.out, null)
	res = Rules.choose_night(game, 2, "silent")
	eq(game.ext.flags, {"jade": "generous"}, "什麼都不說，沒有記號")
	res = Rules.choose_night(game, 3, "keep")
	eq(game.ext.flags, {"jade": "generous", "bangle": "kept"})
	res = Rules.choose_night(game, 4, "take")
	eq(game.ext.flags.bribe, "taken")
	eq(game.ext.out, null)
	res = Rules.choose_night(game, 2, "tell")
	eq(res.out, "dismissed")
	eq(game.ext.out, "dismissed")
	eq(game.ext.flags.press, "told")
	var declare := _game_on(2)
	res = Rules.choose_night(declare, 2, "declare")
	eq(declare.ext.flags, {"press": "declared"})
	eq(declare.ext.out, "dismissed")
	var mistrial := _game_on(4)
	res = Rules.choose_night(mistrial, 4, "report")
	eq(res.out, "mistrial")
	eq(mistrial.ext.out, "mistrial")
	eq(mistrial.ext.flags.bribe, "reported")
	# 報警要先看過照片
	var bangle := _game_on(3)
	res = Rules.choose_night(bangle, 3, "report")
	eq(res.out, null)
	eq(res.beats, [])
	eq(bangle.ext.out, null, "條件不成立，什麼都沒有改")
	eq(bangle.ext.flags, {})
	Rules.reveal_detail(bangle, "P5b")
	res = Rules.choose_night(bangle, 3, "report")
	eq(res.out, "bangle")
	eq(bangle.ext.out, "bangle")
	eq(bangle.ext.flags, {"bangle": "reported"})
	# 沒有這個選項
	res = Rules.choose_night(bangle, 3, "nothing")
	eq(res.beats, [])


func test_continue_without_you() -> void:
	about("你離開之後：餘下的陪審員照樣審，只數他們的票，五票才算")
	var game := _game_on(2)
	Rules.start_room(game)
	Rules.vote(game, "U")
	var snapshot := JSON.stringify(game)
	var res := Rules.continue_without_you(game)
	eq(res.verdict, null, "預設的陪審員只有四票有罪")
	eq(res.day, 5)
	eq(JSON.stringify(game), snapshot, "在複本上演，原來的狀態不動")
	# 馮 Sir 改投有罪，五票：第二天表決過了，從第三天起算
	game.jurors.fung.stamps["c1"] = "trust"
	game.jurors.fung.stamps["g1"] = "trust"
	game.jurors.fung.stamps["g3"] = "trust"
	snapshot = JSON.stringify(game)
	res = Rules.continue_without_you(game)
	eq(res.verdict, "G")
	eq(res.day, 3)
	eq(JSON.stringify(game), snapshot)
	# 第二天還沒表決：從第二天起算
	var early := _game_on(1)
	Rules.hear_day(early, 2)
	Rules.start_room(early)
	early.jurors.fung.stamps["c1"] = "trust"
	early.jurors.fung.stamps["g1"] = "trust"
	early.jurors.fung.stamps["g3"] = "trust"
	res = Rules.continue_without_you(early)
	eq(res.verdict, "G")
	eq(res.day, 2, "今天還沒表決，今天也算")
	# 第五天表決過了：沒有明天
	var late := _game_on(5)
	Rules.start_room(late)
	Rules.vote(late, "NG")
	res = Rules.continue_without_you(late)
	eq(res.verdict, null)
	eq(res.day, 5)


func test_continue_without_you_dismissed_law() -> void:
	about("你離開之後，被揭發的羅生照樣在第四天被解除：餘下五人要五票")
	var game := _game_on(2)
	Rules.hear_day(game, 3)
	Rules.start_room(game)
	Rules.ask(game, "lam")
	Rules.ask(game, "so")
	Rules.call_out(game, "d3-slip")
	Rules.vote(game, "U")
	for jid in ["leung", "wong", "so", "fung"]:
		_make_guilty(game, jid)
	# 第三天已經表決過（四票有罪、你未決），第四天羅生離開：剩下五人，只有梁、黃、蘇、馮四票有罪
	var res := Rules.continue_without_you(game)
	eq(res.verdict, null, "五人裡四票不夠")
	_make_guilty(game, "lam")
	res = Rules.continue_without_you(game)
	eq(res.verdict, "G")
	eq(res.day, 4, "羅生被解除之後，其餘五人一致有罪")
	eq(game.ext.dismissed, {}, "原來的狀態還沒有解除任何人")


func test_ending_ids() -> void:
	about("結局：十個結局各有一個狀態，由上而下第一個條件成立的就是")
	# 離開審判的三個結局：out 最優先，不看裁決
	var dismissed := _game_on(2)
	dismissed.ext.out = "dismissed"
	eq(Rules.ending_of(dismissed, "G", 4).id, "dismissed", "out 比裁決優先")
	var bangle := _game_on(3)
	bangle.ext.out = "bangle"
	eq(Rules.ending_of(bangle, null, 3).id, "bangle")
	var mistrial := _game_on(4)
	mistrial.ext.out = "mistrial"
	eq(Rules.ending_of(mistrial, "NG", 4).id, "mistrial")
	# 收下五千元：有罪、收了錢、你投有罪
	var bribed := _game_on(5)
	bribed.ext.flags["bribe"] = "taken"
	bribed.player.votes.append({"day": 5, "vote": "G", "belief": "U"})
	eq(Rules.ending_of(bribed, "G", 5).id, "bribed")
	var bribed_no := _game_on(5)
	bribed_no.ext.flags["bribe"] = "taken"
	bribed_no.player.votes.append({"day": 5, "vote": "NG", "belief": "U"})
	eq(Rules.ending_of(bribed_no, "G", 5).id, "guilty", "收了錢但你投無罪，是第五票以外的有罪")
	# 一日審判、罪成
	var one := _game_on(1)
	eq(Rules.ending_of(one, "G", 1).id, "oneDay")
	var guilty := _game_on(3)
	eq(Rules.ending_of(guilty, "G", 3).id, "guilty")
	eq(Rules.ending_of(guilty, "G", 2).id, "guilty")
	# 速判無罪（第三天或之前）、合理懷疑（第四、五天）
	var quick := _game_on(2)
	eq(Rules.ending_of(quick, "NG", 1).id, "quickAcquittal")
	eq(Rules.ending_of(quick, "NG", 2).id, "quickAcquittal")
	eq(Rules.ending_of(quick, "NG", 3).id, "quickAcquittal")
	eq(Rules.ending_of(quick, "NG", 4).id, "reasonableDoubt")
	eq(Rules.ending_of(quick, "NG", 5).id, "reasonableDoubt")
	# 替代裁決、無法裁決
	var alt := _game_on(5)
	eq(Rules.ending_of(alt, "A", 5).id, "alternative")
	eq(alt.ext.verdict, "A")
	var hung := _game_on(5)
	eq(Rules.ending_of(hung, null, 5).id, "hung")
	eq(hung.ext.verdict, "none")


func test_ending_beats() -> void:
	about("結局的對白：照 when 篩、拿掉 when、{RESULT} 換成你離開之後的結果，最後是夾萬")
	var game := _game_on(2)
	game.ext.out = "dismissed"
	game.ext.flags["press"] = "told"
	game.ext.flags["jade"] = "generous"
	var e := Rules.ending_of(game, null, 2)
	eq(e.id, "dismissed")
	eq(e.title, "被解除職務")
	check(_has_text(e.beats, "今日報紙登出咗評議室嘅討論"))
	check(not _has_text(e.beats, "你申報咗利益"))
	check(_has_text(e.beats, "未能達成裁決"), "餘下的人也沒有五票")
	for b in e.beats:
		check(not b.has("when"))
		check(not str(b["text"]).contains("{RESULT}"))
	check(_has_text(e.beats, "你打開當舖的夾萬"))
	check(_has_text(e.beats, "玉鐲還在"), "最後沒有無罪，玉鐲沒有贖回")
	check(_has_text(e.beats, "多謝"), "多給了一點")
	eq(game.ext.verdict, "none")
	# 申報利益
	var declared := _game_on(2)
	declared.ext.out = "dismissed"
	declared.ext.flags["press"] = "declared"
	e = Rules.ending_of(declared, null, 2)
	check(_has_text(e.beats, "你申報咗利益"))
	check(not _has_text(e.beats, "今日報紙登出咗"))
	# {RESULT}：餘下的人有五票有罪
	var guilty := _game_on(2)
	guilty.ext.out = "dismissed"
	guilty.jurors.fung.stamps["c1"] = "trust"
	guilty.jurors.fung.stamps["g1"] = "trust"
	guilty.jurors.fung.stamps["g3"] = "trust"
	Rules.start_room(guilty)
	Rules.vote(guilty, "U")
	var without := Rules.continue_without_you(guilty)
	eq(without.verdict, "G")
	e = Rules.ending_of(guilty, without.verdict, without.day)
	eq(e.id, "dismissed")
	check(_has_text(e.beats, "福安樓案六人陪審團裁決　被告謀殺罪成"))
	eq(guilty.ext.verdict, "G", "畫面把 continue_without_you 的裁決傳進來")
	eq(Rules.ending_of(guilty, null, 2).id, "dismissed", "不傳也是同一個結局")
	check(_has_text(Rules.ending_of(guilty, null, 2).beats, "被告謀殺罪成"), "{RESULT} 總是用餘下的人的裁決")
	eq(guilty.ext.verdict, "none", "沒有傳 verdict 就是 none")
	# 夾萬：被告獲釋才贖回玉鐲；金鐲
	var safe := _game_on(5)
	safe.ext.flags["jade"] = "fair"
	safe.ext.flags["bangle"] = "kept"
	e = Rules.ending_of(safe, "NG", 5)
	check(_has_text(e.beats, "已經被贖回"))
	check(_has_text(e.beats, "仍然躺在最底一格"))
	check(not _has_text(e.beats, "當票的背面"))
	var safe_a := _game_on(5)
	safe_a.ext.flags["jade"] = "fair"
	safe_a.ext.flags["bangle"] = "reported"
	e = Rules.ending_of(safe_a, "A", 5)
	check(_has_text(e.beats, "已經被贖回"))
	check(_has_text(e.beats, "已經交給了警察"))
	var safe_g := _game_on(5)
	safe_g.ext.flags["jade"] = "fair"
	e = Rules.ending_of(safe_g, "G", 5)
	check(_has_text(e.beats, "玉鐲還在"))
	var no_flags := _game_on(5)
	e = Rules.ending_of(no_flags, "G", 5)
	eq(e.beats[-1].text, "你打開當舖的夾萬。", "什麼都沒做過，夾萬只有一句")


func test_ending_conditions_inside() -> void:
	about("結局裡的條件：金鐲結局看保安，罷審結局看羅生，合理懷疑看有沒有聽過 q3")
	var bangle := _game_on(3)
	bangle.ext.out = "bangle"
	var e := Rules.ending_of(bangle, null, 3)
	check(_has_text(e.beats, "保安否認拿走死者財物"), "疑 g1 的陪審員不到三個")
	check(not _has_text(e.beats, "被傳召協助調查"))
	for jid in ["leung", "wong", "so"]:
		bangle.jurors[jid].stamps["g1"] = "doubt"
	e = Rules.ending_of(bangle, null, 3)
	check(_has_text(e.beats, "保安鍾永發被傳召協助調查"))
	check(not _has_text(e.beats, "否認拿走"))
	var mistrial := _game_on(4)
	mistrial.ext.out = "mistrial"
	e = Rules.ending_of(mistrial, null, 4)
	check(not _has_text(e.beats, "羅生用外套遮住了頭"))
	mistrial.ext.dismissed["law"] = 4
	e = Rules.ending_of(mistrial, null, 4)
	check(_has_text(e.beats, "羅生用外套遮住了頭"))
	var doubt := _game_on(4)
	e = Rules.ending_of(doubt, "NG", 4)
	check(not _has_text(e.beats, "不排除另有起火點"))
	Rules.hear_claim(doubt, "q3")
	e = Rules.ending_of(doubt, "NG", 4)
	check(_has_text(e.beats, "不排除另有起火點"))
	# 罪成：投了有罪卻疑過保安，筆記本翻到保安那一頁
	var guilty := _game_on(2)
	guilty.player.votes.append({"day": 2, "vote": "G", "belief": "U"})
	e = Rules.ending_of(guilty, "G", 2)
	check(not _has_text(e.beats, "停在保安那一頁"))
	Rules.set_player_stamp(guilty, "g3", "doubt")
	e = Rules.ending_of(guilty, "G", 2)
	check(_has_text(e.beats, "停在保安那一頁"))
	# 沒有符合的結局不會發生：每個裁決都有
	for v in ["G", "NG", "A", null]:
		check(Rules.ending_of(_game_on(5), v, 5).id != "", str(v))
