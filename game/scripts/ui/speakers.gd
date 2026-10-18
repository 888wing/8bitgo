# 說話的人：名牌上的名字、字色、打字速度、嗶聲音高、特寫和法庭裡頭頂的位置。
# 陪審員用他們在案件資料裡的稱呼（梁伯、黃老闆……）。
extends RefCounted

const Pal := preload("res://scripts/pixel/palette.gd")
const CaseData := preload("res://scripts/rules/case_data.gd")

const VOICES := {
	"庭警": {"portrait": "usher", "head": "usher", "pitch": 400.0},
	"控方": {"portrait": "prosecutor", "head": "prosecutor", "pitch": 470.0},
	"辯方": {"portrait": "defense", "head": "defense", "pitch": 520.0},
	"法官": {"portrait": "judge", "head": "judge", "pitch": 300.0},
	"書記": {"pitch": 430.0},
	"被告": {"head": "defendant", "pitch": 380.0},
	"鄭督察": {"portrait": "cheng", "head": "witness", "pitch": 360.0},
	"鍾永發": {"portrait": "chung", "head": "witness", "pitch": 330.0},
	"屈家輝": {"portrait": "wat", "head": "witness", "pitch": 410.0},
	"陳金水": {"portrait": "chan", "head": "witness", "pitch": 340.0},
	"文醫生": {"portrait": "man", "head": "witness", "pitch": 560.0},
	"區主任": {"portrait": "au", "head": "witness", "pitch": 350.0},
	"李志健": {"portrait": "lee", "head": "witness", "pitch": 440.0},
	"何嘉樂": {"portrait": "ho", "head": "witness", "pitch": 420.0},
	"母親": {"pitch": 520.0},
	"女兒": {"pitch": 640.0},
	"何太": {"pitch": 500.0},
	"阿詩": {"pitch": 580.0},
	"陌生人": {"pitch": 280.0},
	"旁白": {"color": Pal.WALL_LIGHT, "speed": 45.0},
	"報紙": {"color": Pal.PAPER, "speed": 60.0},
	"你": {"color": Pal.BRASS_LIGHT, "speed": 40.0},
}

# 陪審員的嗶聲音高
const JURORS := {"leung": 290.0, "wong": 380.0, "law": 320.0, "lam": 600.0, "so": 540.0, "fung": 300.0}

static var _names := {}


static func display(who: String) -> String:
	if _names.is_empty():
		var ui: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/ui.json"))
		_names = ui.speakers
		for s in CaseData.table("SEATS"):
			_names[s.id] = s.call
	if who == "旁白" or who == "報紙":
		return ""
	return _names.get(who, who)


static func voice(who: String) -> Dictionary:
	var v := {"portrait": null, "head": null, "pitch": 0.0, "color": Pal.WHITE, "speed": 32.0}
	v.merge(VOICES.get(who, {}), true)
	if JURORS.has(who):
		v.pitch = JURORS[who]
	v.name = display(who)
	return v
