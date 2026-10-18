# 案件資料：第一次用到才讀 res://data/case.json，之後共用同一份。
# 內容只改 prototype/case.js，改完在 repo 根目錄執行 `npm run case`。
# 用法：const CaseData := preload("res://scripts/rules/case_data.gd")，然後 CaseData.table("CLAIMS")。
# 注意：JSON 的數字讀出來是浮點數；ROOMS 的鍵是字串 "1"、"2"。
extends RefCounted

const PATH := "res://data/case.json"

static var _data: Dictionary = {}


static func data() -> Dictionary:
	if _data.is_empty():
		var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(PATH))
		if typeof(parsed) != TYPE_DICTIONARY:
			push_error("讀不到案件資料：%s" % PATH)
			return {}
		_data = parsed
	return _data


# 取一張表：SEATS、AI_IDS、LINKS、CLAIMS、EXHIBITS、REASONS、CARD_NAMES、THOUGHTS、JURORS、
# REACTIONS、LEAN_IN、ROOMS、CALLOUT、RULEBOOK、PROLOGUE、WITNESSES、DAYS、NIGHT、SCHEDULE、PLAYTEST。
static func table(key: String) -> Variant:
	return data().get(key)
