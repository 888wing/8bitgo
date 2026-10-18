# 法庭桌面：聽證人、拖證物、放大鏡、對照紅線、蓋章、遞紙條。一局裡每天的法庭都在這張桌上。
# 規則全部交給 rules.gd；這裡只管畫面、輸入和時間。由網頁版（commit 3a3a819 的 prototype/desk/court.js）逐段搬過來。
# 固定的美術放在 desk.tscn，打開場景就看得到整張桌；會變的東西（字、筆記、鏡片、紅線）在這裡即場畫。
# 審判的狀態（trial）由 game.gd 給，五天共用；筆記本和桌上的證物也留到下一天。
extends Node2D

signal cursor_changed(shape: int)
signal typed
signal advanced
signal leave_pressed
signal modal_closed
signal line_drawn
signal struck_done

const Rules := preload("res://scripts/rules/rules.gd")
const CaseData := preload("res://scripts/rules/case_data.gd")
const Pal := preload("res://scripts/pixel/palette.gd")
const Draw := preload("res://scripts/pixel/draw.gd")
const Text := preload("res://scripts/pixel/pixel_text.gd")
const L := preload("res://scripts/desk/layout.gd")
const Art := preload("res://scripts/desk/art.gd")
const SoundScript := preload("res://scripts/desk/sound.gd")
const Speakers := preload("res://scripts/ui/speakers.gd")
const MenuScript := preload("res://scripts/ui/menu.gd")

const ZOOM_DWELL := 0.35 # 放大鏡要停留多久才算看清楚（秒）
const WRITE_SPEED := 150.0 # 筆記本寫字的速度（像素／秒）
const PUNCT := "，。、；：？！「」『』（）…—"
const PER_PAGE := 3 # 筆記本每頁最多寫幾個說法；多了就翻到新的一頁（續）
const SLIP := Rect2i(330, 253, 44, 15) # 「紙條」：有問題可以問時才出現

# 字款：[點陣字表, 斷行寬度, 行距, 預設字色]
const STYLE := {
	"dialogue": ["dialogue", 124, 16, Pal.WHITE],
	"name": ["name", 0, 13, Pal.INK],
	"header": ["name", 0, 14, Pal.INK],
	"claim": ["hand", 134, 14, Pal.INK],
	"reason": ["hand", 132, 13, Pal.RED],
	"thought": ["hand", 132, 13, Pal.GREY],
	"caption": ["body", 300, 14, Pal.WHITE],
	"body": ["body", 0, 15, Pal.WHITE],
	"bold": ["bold", 0, 15, Pal.INK],
	"title": ["title", 0, 28, Pal.WHITE],
	"heading": ["heading", 0, 20, Pal.WHITE],
	"small": ["small", 0, 0, Pal.BRASS_LIGHT],
}

# 字幕的字色和框色。
const CAPTION := {
	"hint": [Pal.WHITE, Pal.BRASS],
	"info": [Pal.WHITE, Pal.WALL],
	"you": [Pal.BRASS_LIGHT, Pal.BRASS_DARK],
	"note": [Pal.WHITE, Pal.RED],
}

const Z := {
	"docs": 100, "lens": 300, "loupe": 301, "rack": 310, "stamp": 311, "held": 320,
	"overlay": 400, "line": 410, "bang": 420, "caption": 430, "modal": 500,
}

const TOOLS := {"inspect": L.INSPECT, "booklet": L.BOOKLET, "prev": L.PAGE_PREV, "next": L.PAGE_NEXT}
const KINDS := {"normal": ["trust", "doubt"], "strike": ["struck"]}

var sound: Node # 由 game.gd 給；單獨打開這個場景時自己開一個
var reduced := false # 系統開了「減少動態」：蓋章不震

var C: Dictionary # 案件資料
var ui: Dictionary # 畫面上的字
var trial: Dictionary # 由 game.gd 給；單獨打開時自己開一局
var day := 1
var menu: Node2D
var slip_busy := false
var struck_pending := false
var pages: Array = []
var page_index := 0
var entry_rects: Array = []
var docs: Array = []
var mode := "normal"
var selection: Array = []
var items: Array = []
var drag: Variant = null
var press: Variant = null
var modal: Variant = null
var busy := false
var stamping: Variant = null
var rack_x := float(L.RACK_HIDDEN_X)
var rack_ready := false
var stamp_target: Variant = null
var stamp_busy := {"trust": false, "doubt": false, "struck": false}
var typing: Variant = null
var dialogue_text := "" # 對白框現在畫著的字（測試用：無頭模式讀不回 update 過的圖）
var waiting := false
var voice: Dictionary
var writing: Array = []
var captions: Array = []
var caption: Variant = null
var caption_key := ""
var notes_added := {}
var stats := {"found": 0, "notes": 0, "stamps": 0, "checks": 0}
var loupe := {"x": L.LOUPE_HOME.x, "y": L.LOUPE_HOME.y, "dwell": null}
var lens_key := ""
var on_stand: Variant = null
var walking := false
var line: Variant = null
var text_cache := {}
var cursor := -1
var page_dirty := true
var time_ms := 0.0
var shake_left := 0.0

var _textures := {}
var _lens_mask: Image
var _shade: Image

@onready var witness: Sprite2D = $Witness
@onready var tick_img: Sprite2D = $Tick
@onready var sound_img: Sprite2D = $SoundIcon
@onready var portrait: Sprite2D = $Portrait
@onready var more: Sprite2D = $More
@onready var docs_layer: Node2D = $Docs
@onready var lens: Sprite2D = $Lens
@onready var loupe_img: Sprite2D = $Loupe
@onready var bang: Sprite2D = $Bang
@onready var rack: Sprite2D = $Rack
@onready var stamps := {"trust": $StampTrust as Sprite2D, "doubt": $StampDoubt as Sprite2D, "struck": $StampStruck as Sprite2D}
@onready var slip_img: Sprite2D = $Slip
@onready var stamp_shadow: Sprite2D = $StampShadow
@onready var overlay: Sprite2D = $Overlay
@onready var red_line: Node2D = $RedLine
@onready var modal_img: Sprite2D = $Modal
@onready var tools := {"inspect": $Inspect as Sprite2D, "booklet": $Booklet as Sprite2D, "prev": $PrevPage as Sprite2D, "next": $NextPage as Sprite2D}


func _ready() -> void:
	C = CaseData.data()
	ui = JSON.parse_string(FileAccess.get_file_as_string("res://data/ui.json"))
	if sound == null:
		sound = SoundScript.new()
		add_child(sound)
	if trial.is_empty():
		trial = Rules.create_game({"seed": randi() & 0x7fffffff})
	voice = voice_of("旁白")
	menu = MenuScript.new()
	menu.sound = sound
	add_child(menu)
	_lens_mask = Art.disc(L.LENS_R)
	# 半格網點：對照模式和彈出視窗用它把背景壓暗，不用半透明。
	_shade = Draw.canvas(L.W, L.H)
	Draw.dither(_shade, 0, 0, L.W, L.H, Pal.BLACK)
	for name in ["name", "dialogue", "page", "page_no", "lens", "overlay", "caption", "modal"]:
		var node: Sprite2D = {
			"name": $NameText, "dialogue": $DialogueText, "page": $Page, "page_no": $PageNo,
			"lens": $Lens, "overlay": $Overlay, "caption": $Caption, "modal": $Modal,
		}[name]
		_textures[name] = node
	red_line.draw.connect(_draw_line)
	sound_img.texture = Art.texture("ui/sound-off.png" if sound.muted else "ui/sound-on.png")
	stamp_shadow.texture = Art.shadow(26, 34)
	place_loupe()
	layout_rack()
	draw_name("")
	draw_dialogue("", Pal.WHITE)


func voice_of(who: String) -> Dictionary:
	return Speakers.voice(who)


# —— 會變的圖：每一個都是一張 Image，畫好就換上 ——

func show_image(name: String, img: Image) -> void:
	var node: Sprite2D = _textures[name]
	var tex := node.texture as ImageTexture
	if tex and tex.get_size() == Vector2(img.get_size()):
		tex.update(img)
	else:
		node.texture = ImageTexture.create_from_image(img)


func text_of(str: String, style: String, color: Variant = null, width := -1) -> Dictionary:
	var s: Array = STYLE[style]
	var c: Color = s[3] if color == null else color
	var w: int = s[1] if width < 0 else width
	var key := "%s|%s|%d|%s" % [style, c.to_html(), w, str]
	if not text_cache.has(key):
		text_cache[key] = Text.render(str, s[0], c, w, s[2])
	return text_cache[key]


static func fill(template: String, vars: Dictionary) -> String:
	var out := template
	for k in vars:
		out = out.replace("{%s}" % k, str(int(vars[k])) if vars[k] is float or vars[k] is int else str(vars[k]))
	return out


func draw_name(name: String) -> void:
	var img := Draw.canvas(L.NAME.size.x - 6, 13)
	if name != "":
		Draw.blit(img, text_of(name, "name").image, 2, 0)
	show_image("name", img)


func draw_dialogue(text: String, color: Color) -> void:
	dialogue_text = text
	var img := Draw.canvas(132, 66)
	if text != "":
		Draw.blit(img, Text.render(text, "dialogue", color, 124, 16).image, 0, 0)
	show_image("dialogue", img)


# —— 流程：一天的法庭，一條 await 的時間線。重新開始時整局換新，舊的時間線跟著消失 ——

func play_day(d: int) -> void:
	day = d
	var def: Dictionary = C.DAYS[d - 1]
	for beat in def.get("open", []):
		await court_beat(beat)
	for wid: String in def.witnesses:
		var script: Array = C.WITNESSES[wid].script
		for i in script.size():
			await court_beat(script[i])
			if i == 0:
				call_witness(wid)
		await stamp_phase(wid)
		await dismiss_witness()
	for beat in def.get("closing", []):
		await court_beat(beat)
	for beat in def.adjourn:
		await say(beat)


# 一句證詞：先把說法寫進筆記本、證物送到托盤，再打字；法官剔除說法時，要你親手蓋「不予採納」。
func court_beat(beat: Dictionary) -> void:
	if beat.has("claim"):
		Rules.hear_claim(trial, beat.claim)
		write_claim(C.CLAIMS[beat.claim].witness, beat.claim)
	if beat.has("exhibit"):
		Rules.add_exhibit(trial, beat.exhibit)
		deliver(beat.exhibit)
	if beat.has("rule"):
		Rules.add_rule(trial, beat.rule)
	await say(beat)
	if beat.has("strikeExhibit"):
		Rules.strike_exhibit(trial, beat.strikeExhibit)
		mark_struck(beat.strikeExhibit)
	if beat.has("strike"):
		await strike_phase(beat.strike)


func wait(seconds: float) -> void:
	var tw := create_tween()
	tw.tween_interval(seconds)
	await tw.finished


func say(beat: Dictionary) -> void:
	speak(beat)
	await typed
	waiting = true
	await advanced


# 開始打字，不等玩家按。
func speak(beat: Dictionary) -> void:
	voice = voice_of(beat.who)
	waiting = false
	draw_name(voice.name)
	draw_dialogue("", voice.color)
	typing = {"text": beat.text, "shown": 0.0}


func advance() -> void:
	if typing != null:
		# 跳過打字：即刻畫出整句。tick_typing 只在字數變了才重畫，這裡不畫就會停在打到一半的字
		typing.shown = float(typing.text.length())
		draw_dialogue(typing.text, voice.color)
		return
	if waiting:
		waiting = false
		advanced.emit()


func call_witness(wid: String) -> void:
	turn_to(page_index_of(page_for(wid, false)))
	witness.texture = Art.texture("court/witness-%s.png" % wid)
	witness.position = Vector2(-26, 25)
	witness.visible = true
	walking = true
	var tw := create_tween()
	tw.tween_property(witness, "position:x", 78.0, 1.1)
	tw.finished.connect(func() -> void:
		walking = false
		witness.position.y = 25
		on_stand = wid)


func dismiss_witness() -> void:
	on_stand = null
	walking = true
	var tw := create_tween()
	tw.tween_property(witness, "position:x", -26.0, 1.0)
	await tw.finished
	walking = false
	witness.visible = false


# —— 筆記本 ——

# 這個證人最後一頁；寫滿了（PER_PAGE 個說法）就開新的一頁，抬頭加「（續）」。
func page_for(wid: String, room := true) -> Dictionary:
	var last: Variant = null
	for p in pages:
		if p.wid == wid:
			last = p
	if last != null and (not room or last.entries.size() < PER_PAGE):
		return last
	var w: Dictionary = C.WITNESSES[wid]
	var header := "%s（%s）" % [w.name, w.side] if last == null else "%s（續）" % w.name
	var page := {"wid": wid, "header": text_of(header, "header"), "entries": []}
	pages.append(page)
	return page


func page_index_of(page: Dictionary) -> int:
	for i in pages.size():
		if is_same(pages[i], page):
			return i
	return -1


func entry_of(claim: String) -> Variant:
	for p in pages:
		for e in p.entries:
			if e.claim == claim:
				return e
	return null


func turn_to(index: int) -> void:
	if index < 0 or index >= pages.size():
		return
	if index != page_index:
		sound.paper()
	page_index = index
	page_dirty = true


static func _sum(list: Array) -> int:
	var n := 0
	for v in list:
		n += v
	return n


func write_claim(wid: String, claim: String) -> void:
	var page := page_for(wid)
	var text := text_of(C.CLAIMS[claim].text, "claim")
	var entry := {"claim": claim, "text": text, "shown": 0.0, "notes": [], "imprints": []}
	page.entries.append(entry)
	writing.append({"item": entry, "total": _sum(text.widths)})
	turn_to(page_index_of(page))


func add_note(claim: String, str: String, style: String) -> void:
	var entry: Variant = entry_of(claim)
	if entry == null:
		return
	var text := text_of(str, style)
	var note := {"text": text, "shown": 0.0, "style": style, "str": str}
	entry.notes.append(note)
	writing.append({"item": note, "total": _sum(text.widths)})
	stats.notes += 1
	for i in pages.size():
		if pages[i].entries.any(func(e: Dictionary) -> bool: return is_same(e, entry)):
			turn_to(i)


# 逐行把字露出來，像筆在寫。
func reveal_text(img: Image, t: Dictionary, shown: float, x: int, y: int) -> void:
	var left := shown
	var lh: int = t.line_height
	for i in t.widths.size():
		var w: int = t.widths[i]
		var visible := mini(w, maxi(0, ceili(left)))
		left -= w
		if visible > 0:
			Draw.blit_part(img, t.image, 0, i * lh, visible, lh, x, y + i * lh)


func draw_page() -> void:
	var img := Draw.canvas(L.PAGE.size.x, L.PAGE.size.y)
	entry_rects = []
	if page_index < pages.size():
		var page: Dictionary = pages[page_index]
		Draw.blit(img, page.header.image, 0, 0)
		Draw.dotted_line(img, 0, 15, L.PAGE.size.x, Pal.PAPER_LINE)
		var y := 18
		for e in page.entries:
			var top := y
			reveal_text(img, e.text, e.shown, 26, y)
			y += e.text.height
			for n in e.notes:
				reveal_text(img, n.text, n.shown, 26, y)
				y += n.text.height
			var h := maxi(24, y - top)
			# 舊的印劃一筆，新的印蓋在上面：印章蓋了就擦不走。
			for imp in e.imprints:
				var ix: int = 1 + imp.dx
				var iy: int = top + imp.dy
				Draw.blit(img, imp.image, ix, iy)
				if imp.crossed:
					Draw.line(img, ix, iy + 21, ix + 21, iy, Pal.INK)
			if stamp_target == e.claim:
				Draw.dotted_frame(img, 0, top - 1, L.PAGE.size.x, h + 2, Pal.INK)
			entry_rects.append({
				"claim": e.claim,
				"row": Rect2i(L.PAGE.position.x, L.PAGE.position.y + top - 1, L.PAGE.size.x, h + 2),
				"text": Rect2i(L.PAGE.position.x + 25, L.PAGE.position.y + top - 1, e.text.widths.max() + 2, e.text.height + 1),
			})
			y = top + h + 2
			Draw.dotted_line(img, 26, y - 1, L.PAGE.size.x - 26, Pal.PAPER_LINE)
	show_image("page", img)
	var no := Draw.canvas(L.PAGE_NO.size.x, L.PAGE_NO.size.y)
	if pages.size():
		Draw.blit(no, text_of("%d/%d" % [page_index + 1, pages.size()], "small").image, 0, 0)
	show_image("page_no", no)
	if mode == "inspect":
		draw_overlay()


# —— 證物 ——

# 托盤放得下四件；多了就疊起來，後到的蓋在上面。
func slot_pos(slot: int) -> Vector2i:
	var step := mini(L.SLOT_STEP, floori((L.TRAY.end.x - 4 - 24 - L.SLOTS.x) / float(maxi(1, docs.size() - 1))))
	return Vector2i(L.SLOTS.x + slot * step, L.SLOTS.y)


func relayout_tray() -> void:
	for d in docs:
		if d.form == "icon" and not d.arriving and not (drag != null and drag.kind == "doc" and is_same(drag.doc, d)):
			var sp := slot_pos(d.slot)
			set_doc(d, "icon", sp.x, sp.y)


func size_of(doc: Dictionary, form: String = "") -> Vector2i:
	if form == "":
		form = doc.form
	return Vector2i(24, 18) if form == "icon" else Art.doc_size(doc.id)


func deliver(id: String) -> void:
	var doc := {"id": id, "slot": docs.size(), "form": "icon", "on_desk": false, "x": 0, "y": 0, "lift": false, "arriving": true}
	doc.shadow = _sprite(docs_layer)
	doc.shadow.visible = false
	doc.img = _sprite(docs_layer)
	docs.append(doc)
	restack()
	relayout_tray()
	var sp := slot_pos(doc.slot)
	set_doc(doc, "icon", sp.x, sp.y - 16)
	var tw := create_tween()
	tw.tween_property(doc.img, "position:y", float(sp.y), 0.22).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	tw.finished.connect(func() -> void:
		doc.arriving = false
		doc.shadow.visible = true
		set_doc(doc, "icon", sp.x, sp.y)
		sound.paper())
	queue_caption(fill(ui.delivered, C.EXHIBITS[id]), "info")
	if trial.get("ext", {}).get("struck_exhibits", {}).has(id):
		mark_struck(id)


# 被裁定不予接納的證物：蓋上紅色的印。
func mark_struck(id: String) -> void:
	for d in docs:
		if d.id == id and not d.has("struck"):
			var mark := Sprite2D.new()
			mark.centered = false
			mark.texture = Art.texture("rack/imprint-struck.png")
			mark.position = Vector2(1, 1)
			d.img.add_child(mark)
			d.struck = mark


func _sprite(parent: Node) -> Sprite2D:
	var s := Sprite2D.new()
	s.centered = false
	parent.add_child(s)
	return s


func set_doc(doc: Dictionary, form: String, x: float, y: float) -> void:
	doc.form = form
	doc.x = roundi(x)
	doc.y = roundi(y)
	var path := "evidence/%s-icon.png" % doc.id if form == "icon" else "evidence/%s.png" % doc.id
	var tex := Art.texture(path)
	if doc.img.texture != tex:
		doc.img.texture = tex
	doc.img.position = Vector2(doc.x, doc.y)
	var s := size_of(doc, form)
	doc.shadow.texture = Art.shadow(s.x, s.y)
	var off := 3 if doc.lift else 1
	doc.shadow.position = Vector2(doc.x + off, doc.y + off)


func restack() -> void:
	for i in docs.size():
		docs[i].shadow.z_index = Z.docs + i * 2
		docs[i].img.z_index = Z.docs + i * 2 + 1


func doc_at(x: int, y: int, filter := Callable()) -> Variant:
	for i in range(docs.size() - 1, -1, -1):
		var d: Dictionary = docs[i]
		if d.arriving or (filter.is_valid() and not filter.call(d)):
			continue
		if L.inside(Rect2i(Vector2i(d.x, d.y), size_of(d)), x, y):
			return d
	return null


static func _full(d: Dictionary) -> bool:
	return d.form == "full"


func grab_doc(doc: Dictionary, x: int, y: int) -> void:
	var s := size_of(doc)
	docs.remove_at(docs.find_custom(func(d: Dictionary) -> bool: return is_same(d, doc)))
	docs.append(doc)
	restack()
	doc.lift = true
	drag = {"kind": "doc", "doc": doc, "fx": float(x - doc.x) / s.x, "fy": float(y - doc.y) / s.y, "sx": x, "sy": y, "moved": false}
	set_doc(doc, doc.form, doc.x, doc.y)
	sound.paper()


# 拖到托盤上就縮成小圖，拖出來就攤開；手指捏住的位置保持不變。
func move_doc(x: int, y: int) -> void:
	var d: Dictionary = drag
	if not d.moved and absi(x - d.sx) + absi(y - d.sy) < 3:
		return
	d.moved = true
	var form := "icon" if L.inside(L.TRAY, x, y) else "full"
	var s := size_of(d.doc, form)
	var nx: float = x - d.fx * s.x
	var ny: float = y - d.fy * s.y
	if form == "full":
		var a := L.DOC_AREA
		nx = clampf(nx, a.position.x, a.end.x - s.x)
		ny = clampf(ny, a.position.y, a.end.y - s.y)
	set_doc(d.doc, form, nx, ny)


func drop_doc() -> void:
	var doc: Dictionary = drag.doc
	var moved: bool = drag.moved
	drag = null
	doc.lift = false
	if not moved and not doc.on_desk:
		# 只點一下托盤上的小圖：替你攤到桌上。
		var s := size_of(doc, "full")
		var a := L.DOC_AREA
		doc.on_desk = true
		set_doc(doc, "full",
			clampi(L.TRAY.position.x + 4 + doc.slot * 10, a.position.x, a.end.x - s.x),
			clampi(L.TRAY.position.y + 34 + doc.slot * 6, a.position.y, a.end.y - s.y))
	elif doc.form == "icon":
		doc.on_desk = false
		var sp := slot_pos(doc.slot)
		set_doc(doc, "icon", sp.x, sp.y)
	else:
		doc.on_desk = true
		set_doc(doc, "full", doc.x, doc.y)
	sound.paper()


# —— 放大鏡 ——

func place_loupe() -> void:
	var x: int = loupe.x
	var y: int = loupe.y
	loupe_img.position = Vector2(x - 22, y - 22)
	lens.position = Vector2(x - L.LENS_R, y - L.LENS_R)
	if bang.visible:
		bang.position = Vector2(x + 12, y - 36)


func on_loupe(x: int, y: int) -> bool:
	var dx: int = x - loupe.x
	var dy: int = y - loupe.y
	if dx * dx + dy * dy <= 22 * 22:
		return true
	return dx >= 12 and dx <= 38 and dy >= 12 and dy <= 38 and absi(dx - dy) <= 4


func grab_loupe(x: int, y: int) -> void:
	drag = {"kind": "loupe", "ox": x - loupe.x, "oy": y - loupe.y}


func move_loupe(x: int, y: int) -> void:
	var b := L.LOUPE_BOUNDS
	loupe.x = clampi(x - drag.ox, b.position.x, b.end.x - 1)
	loupe.y = clampi(y - drag.oy, b.position.y, b.end.y - 1)
	place_loupe()


# 鏡片裡畫的是證物的兩倍圖，用一個圓形遮罩剪出來。
func draw_lens(doc: Variant) -> void:
	var key := "%d,%d,%s,%d,%d" % [loupe.x, loupe.y, doc.id, doc.x, doc.y] if doc != null else ""
	if key == lens_key:
		return
	lens_key = key
	var size := L.LENS_R * 2 + 1
	var out := Draw.canvas(size, size)
	if doc != null:
		var img := Draw.canvas(size, size)
		img.fill(Pal.LEATHER_DARK)
		Draw.blit(img, Art.image("evidence/%s-zoom.png" % doc.id), L.LENS_R - 2 * (loupe.x - doc.x), L.LENS_R - 2 * (loupe.y - doc.y))
		out.blit_rect_mask(img, _lens_mask, Rect2i(0, 0, size, size), Vector2i.ZERO)
	show_image("lens", out)


func tick_loupe(delta: float) -> void:
	var x: int = loupe.x
	var y: int = loupe.y
	var doc: Variant = doc_at(x, y, _full)
	draw_lens(doc)
	if drag == null or drag.kind != "loupe" or doc == null:
		loupe.dwell = null
		return
	var u: int = x - doc.x
	var v: int = y - doc.y
	var spot: Variant = null
	for d in C.EXHIBITS[doc.id].details:
		var r: Variant = Art.hotspot(doc.id, d.id)
		if d.get("zoom", false) and not trial.zoomed.get(d.id, false) and r != null and L.inside(r, u, v):
			spot = d
			break
	if spot == null:
		loupe.dwell = null
		return
	if loupe.dwell == null or loupe.dwell.id != spot.id:
		loupe.dwell = {"id": spot.id, "t": 0.0}
	loupe.dwell.t += delta
	if loupe.dwell.t >= ZOOM_DWELL:
		loupe.dwell = null
		discover(spot)


func discover(spot: Dictionary) -> void:
	if not Rules.reveal_detail(trial, spot.id):
		return
	stats.found += 1
	sound.found()
	bang.visible = true
	place_loupe()
	var tw := create_tween()
	tw.tween_interval(1.0)
	tw.tween_callback(func() -> void: bang.visible = false)
	queue_caption(spot.text, "info", true)
	if spot.has("eye"):
		queue_caption(spot.eye, "you")


# —— 對照 ——

func set_mode(m: String) -> void:
	if mode == m:
		return
	mode = m
	selection = []
	tools.inspect.texture = Art.texture("desk/plaque-inspect-on.png" if m == "inspect" else "desk/plaque-inspect.png")
	overlay.visible = m == "inspect"
	if m == "inspect":
		draw_overlay()


# 可以點的東西：這一頁上沒被證物蓋住的說法，以及桌上證物已經看得見的細節。
func selectables() -> Array:
	var out: Array = []
	for r in entry_rects:
		var c := L.center(r.text)
		if doc_at(c.x, c.y) == null:
			out.append({"kind": "claim", "id": r.claim, "rect": r.text})
	for doc in docs:
		if doc.form != "full":
			continue
		for d in Rules.visible_details(trial, doc.id):
			var spot: Variant = Art.hotspot(doc.id, d.id)
			if spot == null:
				continue
			var rect := Rect2i(doc.x + spot.position.x, doc.y + spot.position.y, spot.size.x, spot.size.y)
			var c := L.center(rect)
			if is_same(doc_at(c.x, c.y), doc):
				out.append({"kind": "detail", "id": d.id, "rect": rect, "doc": doc})
	return out


func _selected(id: String) -> bool:
	for s in selection:
		if s.id == id:
			return true
	return false


func draw_overlay() -> void:
	items = selectables()
	var a := L.DOC_AREA
	var img := _shade.get_region(Rect2i(Vector2i.ZERO, a.size))
	for it in items:
		var x: int = it.rect.position.x - a.position.x
		var y: int = it.rect.position.y - a.position.y
		var w: int = it.rect.size.x
		var h: int = it.rect.size.y
		Draw.rect(img, x - 1, y - 1, w + 2, h + 2, Draw.CLEAR)
		if _selected(it.id):
			Draw.frame(img, x - 2, y - 2, w + 4, h + 4, Pal.RED)
			Draw.frame(img, x - 1, y - 1, w + 2, h + 2, Pal.RED)
		else:
			Draw.dotted_frame(img, x - 2, y - 2, w + 4, h + 4, Pal.BRASS_LIGHT)
	show_image("overlay", img)


func pick(x: int, y: int) -> void:
	var doc: Variant = doc_at(x, y, _full)
	var it: Variant = null
	for i in items:
		if L.inside(L.grow(i.rect, 2), x, y) and (is_same(i.get("doc"), doc) if doc != null else i.kind == "claim"):
			it = i
			break
	if it == null:
		return
	var at := -1
	for i in selection.size():
		if selection[i].id == it.id:
			at = i
	if at >= 0:
		selection.remove_at(at)
	else:
		selection.append(it)
	sound.pen()
	draw_overlay()
	if selection.size() == 2:
		check(selection[0], selection[1])


func check(a: Dictionary, b: Dictionary) -> void:
	busy = true
	await draw_red_line(L.center(a.rect), L.center(b.rect))
	var res: Dictionary = Rules.cross_check(trial, a.id, b.id)
	stats.checks += 1
	var claim: Variant = null
	for it in [a, b]:
		if it.kind == "claim":
			claim = it.id
			break
	if res.kind == "reason":
		var r: Dictionary = C.REASONS[res.reason]
		add_note(claim if claim != null else r.claims[0], r.jot, "reason")
		sound.found()
		queue_caption(r.note, "note", true)
	elif res.kind == "known":
		queue_caption(ui.known, "info", true)
	elif res.kind == "thought":
		for t in C.THOUGHTS:
			if t.pair.has(a.id) and t.pair.has(b.id):
				var key := "+".join(t.pair)
				if not notes_added.has(key):
					notes_added[key] = true
					var target: Variant = claim
					if target == null:
						for id in t.pair:
							if C.CLAIMS.has(id):
								target = id
								break
					add_note(target, t.jot, "thought")
				break
		queue_caption(res.text, "you", true)
	# 對不上的話，紅線收回，甚麼都不寫：遊戲不判對錯。
	await wait(0.45 if res.kind == "none" else 0.8)
	fade_line()
	selection = []
	busy = false
	if res.kind == "none":
		draw_overlay()
	else:
		set_mode("normal")


func draw_red_line(from: Vector2i, to: Vector2i) -> void:
	sound.pen()
	red_line.modulate.a = 1.0
	line = {"pts": Draw.line_points(from.x, from.y, to.x, to.y), "shown": 0.0, "done": false}
	await line_drawn


const RING := [
	Vector2i(-1, -3), Vector2i(0, -3), Vector2i(1, -3), Vector2i(-2, -2), Vector2i(2, -2), Vector2i(-3, -1), Vector2i(3, -1),
	Vector2i(-3, 0), Vector2i(3, 0), Vector2i(-3, 1), Vector2i(3, 1), Vector2i(-2, 2), Vector2i(2, 2), Vector2i(-1, 3),
	Vector2i(0, 3), Vector2i(1, 3),
]


func tick_line(delta: float) -> void:
	if line == null or line.done:
		return
	var n: int = line.pts.size()
	line.shown = minf(n, line.shown + delta * 1200.0)
	red_line.queue_redraw()
	if int(line.shown) >= n:
		line.done = true
		line_drawn.emit()


func _draw_line() -> void:
	if line == null:
		return
	var n := int(line.shown)
	for i in n:
		red_line.draw_rect(Rect2(line.pts[i], Vector2(2, 2)), Pal.RED)
	var ends: Array = [line.pts[0]]
	if n >= line.pts.size():
		ends.append(line.pts[-1])
	for e: Vector2i in ends:
		for p: Vector2i in RING:
			red_line.draw_rect(Rect2(e + p, Vector2(1, 1)), Pal.RED)


# 一格一格地淡出，不用平滑的透明度。
func fade_line() -> void:
	var tw := create_tween()
	for step in range(1, 4):
		tw.tween_interval(0.09)
		tw.tween_callback(func() -> void:
			red_line.modulate.a = 1.0 - step / 3.0
			if step >= 3:
				line = null
				red_line.queue_redraw())


# —— 蓋章 ——

func stamp_phase(wid: String) -> void:
	stamping = {"wid": wid, "mode": "normal"}
	turn_to(page_index_of(page_for(wid, false)))
	speak({"who": "旁白", "text": fill(ui.stepDown, {"name": C.WITNESSES[wid].name})})
	await slide_rack(true)
	await leave_pressed
	await slide_rack(false)
	stamping = null


# 法官剔除一個說法：印章盤只放紅色的「不予採納」，你要親手蓋在那一行，才繼續。
func strike_phase(claim: String) -> void:
	Rules.strike_claim(trial, claim)
	var entry: Variant = entry_of(claim)
	if entry == null:
		Rules.set_player_stamp(trial, claim, "struck")
		return
	stamping = {"wid": C.CLAIMS[claim].witness, "mode": "strike", "claim": claim}
	for i in pages.size():
		if pages[i].entries.any(func(e: Dictionary) -> bool: return is_same(e, entry)):
			turn_to(i)
	speak({"who": "旁白", "text": fill(ui.strikeHint, {"claim": C.CLAIMS[claim].text})})
	await slide_rack(true)
	await struck_done
	await slide_rack(false)
	stamping = null


func rack_mode() -> String:
	return stamping.mode if stamping != null else "normal"


# 提問紙條：證人退庭前，可以遞一張紙條給法官（每天一張）。
func slip_available() -> bool:
	return stamping != null and stamping.mode == "normal" and rack_ready and not slip_busy and drag == null \
		and not Rules.slips_for(trial, stamping.wid).is_empty()


func ask_slip() -> void:
	var slips: Array = Rules.slips_for(trial, stamping.wid)
	var i: int = await menu.ask(ui.slip.title, slips.map(func(q: Dictionary) -> Dictionary: return {"text": q.question}), ui.slip.cancel)
	if i < 0 or stamping == null:
		return
	slip_busy = true
	var beats: Array = Rules.use_slip(trial, slips[i].id)
	stats.slips = stats.get("slips", 0) + 1
	await slide_rack(false)
	for beat in beats:
		await court_beat(beat)
	speak({"who": "旁白", "text": fill(ui.stepDown, {"name": C.WITNESSES[stamping.wid].name})})
	await slide_rack(true)
	slip_busy = false


func slide_rack(show: bool) -> void:
	rack_ready = false
	sound.clack()
	var tw := create_tween()
	tw.tween_method(func(x: float) -> void:
		rack_x = x
		layout_rack(), rack_x, float(L.RACK_SHOWN_X if show else L.RACK_HIDDEN_X), 0.26).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	await tw.finished
	rack_ready = show
	layout_rack()


func rack_rect() -> Rect2i:
	return Rect2i(roundi(rack_x), L.RACK_Y, L.RACK_W, L.RACK_H)


func stamp_home(kind: String) -> Vector2i:
	var slot: Vector2i = L.RACK_SLOTS["trust" if kind == "struck" else kind]
	return Vector2i(roundi(rack_x) + slot.x, L.RACK_Y + slot.y)


# 平時印章盤上是「信」「疑」；法官剔除說法時，只放紅色的「不予採納」。
func layout_rack() -> void:
	rack.position.x = roundi(rack_x)
	var shown: Array = KINDS[rack_mode()]
	for kind in stamps:
		stamps[kind].visible = shown.has(kind) or stamp_busy[kind] or (drag != null and drag.kind == "stamp" and drag.which == kind)
		if (drag != null and drag.kind == "stamp" and drag.which == kind) or stamp_busy[kind]:
			continue
		stamps[kind].position = Vector2(stamp_home(kind))


func stamp_at(x: int, y: int) -> Variant:
	for kind in KINDS[rack_mode()]:
		var s: Sprite2D = stamps[kind]
		if not stamp_busy[kind] and L.inside(Rect2i(Vector2i(s.position), Vector2i(26, 34)), x, y):
			return kind
	return null


func grab_stamp(kind: String, x: int, y: int) -> void:
	var s: Sprite2D = stamps[kind]
	drag = {"kind": "stamp", "which": kind, "ox": x - int(s.position.x), "oy": y - int(s.position.y)}
	s.z_index = Z.held
	stamp_shadow.visible = true
	sound.clack()
	move_stamp(x, y)


# 印章底部的中點對準哪一條說法，就蓋在哪一條。
func move_stamp(x: int, y: int) -> void:
	var s: Sprite2D = stamps[drag.which]
	s.position = Vector2(clampi(x - drag.ox, 0, L.W - 26), clampi(y - drag.oy, 0, L.H - 34))
	stamp_shadow.position = s.position + Vector2(3, 3)
	var fx := int(s.position.x) + 13
	var fy := int(s.position.y) + 31
	var target: Variant = null
	if doc_at(fx, fy) == null:
		for r in entry_rects:
			if L.inside(r.row, fx, fy):
				target = r.claim
				break
	if target != stamp_target:
		stamp_target = target
		page_dirty = true


func drop_stamp() -> void:
	var kind: String = drag.which
	var s: Sprite2D = stamps[kind]
	drag = null
	stamp_shadow.visible = false
	var claim: Variant = stamp_target
	stamp_target = null
	page_dirty = true
	stamp_busy[kind] = true
	if claim != null:
		var down := create_tween()
		down.tween_property(s, "position:y", s.position.y + 3, 0.05).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
		await down.finished
		stamp_claim(claim, kind)
		await wait(0.08)
	var back := create_tween()
	back.tween_property(s, "position", Vector2(stamp_home(kind)), 0.17).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	await back.finished
	s.z_index = Z.stamp
	stamp_busy[kind] = false
	layout_rack()
	if struck_pending:
		struck_pending = false
		struck_done.emit()


func stamp_claim(claim: String, kind: String) -> void:
	var entry: Variant = entry_of(claim)
	# 被剔除的說法不可以再蓋信或疑；紅色的印只可以蓋在法官剔除的那一行。
	if kind == "struck" and (stamping == null or claim != stamping.get("claim")):
		return
	if kind != "struck" and trial.struck.get(claim, false):
		return
	# 證人還在台上時改印章不算改主意；翻回前一頁改，就會記下來。
	var current: bool = stamping != null and C.CLAIMS[claim].witness == stamping.wid
	var changed: bool = Rules.set_player_stamp(trial, claim, kind, kind == "struck" or not current)
	if kind == "struck":
		struck_pending = true
	sound.thud()
	if not reduced:
		shake_left = 0.09
	if not changed or entry == null:
		return
	for imp in entry.imprints:
		imp.crossed = true
	entry.imprints.append({"image": Art.imprint(kind), "kind": kind, "dx": randi_range(-1, 1), "dy": randi_range(-1, 1), "crossed": false})
	stats.stamps += 1
	page_dirty = true


func leave() -> void:
	if stamping == null or stamping.mode != "normal" or not rack_ready or drag != null or slip_busy:
		return
	var blank := false
	for id in C.WITNESSES[stamping.wid].claims:
		if trial.heard.has(id) and trial.player.stamps.get(id) == null:
			blank = true
	if blank:
		queue_caption(ui.blank, "info", true)
	leave_pressed.emit()


# —— 字幕和提示 ——

func queue_caption(text: String, kind := "info", now := false) -> void:
	var c := {"text": text, "kind": kind, "t": 0.0, "life": 1.8 + text.length() * 0.09}
	if now:
		captions = [c]
		caption = null
	else:
		captions.append(c)


# 提示跟著你做了甚麼自己更新；做過一次就不再出現。
func hint() -> Variant:
	if modal != null:
		return null
	var h: Dictionary = ui.hints
	if stamping != null:
		if stamping.mode == "strike":
			return fill(ui.strikeHint, {"claim": C.CLAIMS[stamping.claim].text})
		return h.stamp
	if mode == "inspect":
		return h.pickSecond if selection.size() else h.pickFirst
	if docs.is_empty():
		return null
	if not docs.any(func(d: Dictionary) -> bool: return d.on_desk):
		return h.drag
	if not stats.found:
		return h.loupe
	if not stats.checks:
		return h.inspect
	return null


func tick_caption(delta: float) -> void:
	if caption != null:
		caption.t += delta
		if caption.t >= caption.life:
			caption = null
	if caption == null and captions.size():
		caption = captions.pop_front()
	var h: Variant = hint()
	var show: Variant = caption if caption != null else ({"text": h, "kind": "hint"} if h != null else null)
	var key: String = "%s|%s" % [show.kind, show.text] if show != null else ""
	if key == caption_key:
		return
	caption_key = key
	var img := Draw.canvas(L.CAPTION.size.x, L.CAPTION.size.y)
	if show != null:
		var colors: Array = CAPTION[show.kind]
		var t := text_of(show.text, "caption", colors[0])
		var w: int = t.widths.max() + 12
		var hh: int = t.height + 5
		var x := floori((L.CAPTION.size.x - w) / 2.0)
		var y := L.CAPTION.size.y - hh
		Draw.rect(img, x, y, w, hh, Pal.BLACK)
		Draw.frame(img, x, y, w, hh, colors[1])
		Draw.blit(img, t.image, x + 6, y + 3)
	show_image("caption", img)


# —— 彈出視窗：《陪審員須知》 ——

func show_modal(kind: String) -> void:
	modal = {"kind": kind}
	var img: Image = _shade.duplicate()
	draw_booklet(img)
	show_image("modal", img)
	modal_img.visible = true


func close_modal() -> void:
	if modal == null:
		return
	modal = null
	modal_img.visible = false
	modal_closed.emit()


func draw_booklet(img: Image) -> void:
	var x := 60
	var y := 8
	var w := 360
	var h := 254
	Draw.dither(img, x + 3, y + 3, w, h, Pal.BLACK)
	Draw.rect(img, x, y, w, h, Pal.PAPER)
	Draw.frame(img, x, y, w, h, Pal.PAPER_SHADE)
	Draw.blit(img, text_of(ui.booklet, "bold").image, x + 12, y + 8)
	Draw.rect(img, x + 12, y + 24, w - 24, 1, Pal.INK)
	var ty := y + 30
	for i in trial.rules.size():
		var t := text_of("%s、%s" % [ui.numbers[i], C.RULEBOOK[trial.rules[i]]], "body", Pal.INK, w - 24)
		Draw.blit(img, t.image, x + 12, ty)
		ty += t.height + 4
	var close := text_of(ui.close, "body", Pal.GREY)
	Draw.blit(img, close.image, x + w - close.width - 10, y + h - 20)


# —— 輸入：位置一律是 480×270 的遊戲座標 ——

func _unhandled_input(event: InputEvent) -> void:
	if not is_visible_in_tree():
		return
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		var p := Vector2i(event.position.floor())
		if event.pressed:
			on_down(p.x, p.y)
		else:
			on_up(p.x, p.y)
	elif event is InputEventMouseMotion:
		var p := Vector2i(event.position.floor())
		on_move(p.x, p.y)
	elif event is InputEventKey and event.pressed and not event.echo:
		on_key(event.keycode)


func tool_at(x: int, y: int) -> Variant:
	for id in TOOLS:
		if L.inside(L.strip(TOOLS[id]), x, y):
			return id
	if slip_available() and L.inside(L.strip(SLIP), x, y):
		return "slip"
	if stamping != null and rack_ready and mode == "normal":
		var r := rack_rect()
		if L.inside(Rect2i(r.position + L.RACK_LEAVE.position, L.RACK_LEAVE.size), x, y):
			return "leave"
	return null


func press_tool(id: String, down: bool) -> void:
	if tools.has(id):
		tools[id].position.y = TOOLS[id].position.y + (1 if down else 0)
	elif id == "slip":
		slip_img.position.y = SLIP.position.y + (1 if down else 0)
	if down:
		sound.clack()


func use_tool(id: String) -> void:
	match id:
		"inspect":
			set_mode("normal" if mode == "inspect" else "inspect")
		"booklet":
			show_modal("booklet")
		"prev":
			turn_to(page_index - 1)
		"next":
			turn_to(page_index + 1)
		"leave":
			leave()
		"slip":
			ask_slip()


func toggle_sound() -> void:
	sound.set_muted(not sound.muted)
	sound_img.texture = Art.texture("ui/sound-off.png" if sound.muted else "ui/sound-on.png")


func on_down(x: int, y: int) -> void:
	if modal != null:
		close_modal()
		return
	if menu.visible:
		return
	if busy or drag != null:
		return
	if L.inside(L.SOUND, x, y):
		toggle_sound()
		return
	var tool: Variant = tool_at(x, y)
	if tool != null:
		press = {"kind": "tool", "id": tool}
		press_tool(tool, true)
		return
	var on_desk := x >= L.DESK.position.x and y >= L.DESK.position.y
	if mode == "inspect":
		if L.inside(L.DOC_AREA, x, y):
			pick(x, y)
		elif not on_desk:
			press = {"kind": "advance", "x": x, "y": y}
		return
	if stamping != null and rack_ready:
		var kind: Variant = stamp_at(x, y)
		if kind != null:
			grab_stamp(kind, x, y)
			return
		if L.inside(rack_rect(), x, y):
			return
	if on_loupe(x, y):
		grab_loupe(x, y)
		return
	var doc: Variant = doc_at(x, y)
	if doc != null:
		grab_doc(doc, x, y)
		return
	if not on_desk:
		press = {"kind": "advance", "x": x, "y": y}


func on_move(x: int, y: int) -> void:
	if drag != null:
		match drag.kind:
			"doc":
				move_doc(x, y)
			"loupe":
				move_loupe(x, y)
			"stamp":
				move_stamp(x, y)
	update_cursor(x, y)


func on_up(px: int, py: int) -> void:
	var x := clampi(px, 0, L.W - 1)
	var y := clampi(py, 0, L.H - 1)
	if press != null:
		var p: Dictionary = press
		press = null
		if p.kind == "tool":
			press_tool(p.id, false)
			if tool_at(x, y) == p.id:
				use_tool(p.id)
		elif absi(x - p.x) + absi(y - p.y) < 8:
			advance()
		return
	if drag != null:
		match drag.kind:
			"doc":
				drop_doc()
			"loupe":
				drag = null
			"stamp":
				drop_stamp()
	update_cursor(x, y)


func on_key(key: Key) -> void:
	if key == KEY_M:
		toggle_sound()
		return
	if modal != null:
		if key in [KEY_SPACE, KEY_ENTER, KEY_KP_ENTER, KEY_ESCAPE]:
			close_modal()
		return
	if key == KEY_ESCAPE and mode == "inspect":
		set_mode("normal")
	elif key in [KEY_SPACE, KEY_ENTER, KEY_KP_ENTER, KEY_RIGHT]:
		advance()


func update_cursor(x: int, y: int) -> void:
	var c := Input.CURSOR_ARROW
	if drag != null:
		c = Input.CURSOR_DRAG
	elif modal != null or menu.visible:
		c = Input.CURSOR_POINTING_HAND
	elif L.inside(L.SOUND, x, y) or tool_at(x, y) != null:
		c = Input.CURSOR_POINTING_HAND
	elif mode == "inspect":
		c = Input.CURSOR_POINTING_HAND if items.any(func(i: Dictionary) -> bool: return L.inside(L.grow(i.rect, 2), x, y)) else Input.CURSOR_ARROW
	elif (stamping != null and rack_ready and stamp_at(x, y) != null) or on_loupe(x, y) or doc_at(x, y) != null:
		c = Input.CURSOR_CAN_DROP
	elif x < L.DESK.position.x or y < L.DESK.position.y:
		c = Input.CURSOR_POINTING_HAND
	if c != cursor:
		cursor = c
		cursor_changed.emit(c)


# —— 每一格 ——

func _process(delta: float) -> void:
	time_ms += delta * 1000.0
	tick_typing(delta)
	tick_writing(delta)
	tick_portrait()
	tick_loupe(delta)
	tick_line(delta)
	tick_caption(delta)
	more.visible = waiting and typing == null and int(time_ms / 400.0) % 2 == 0
	slip_img.visible = slip_available()
	if walking:
		witness.position.y = 25 - (int(witness.position.x / 4.0) % 2)
	if page_dirty:
		page_dirty = false
		draw_page()
	if shake_left > 0.0:
		shake_left -= delta
		position = Vector2(randi_range(-3, 3), randi_range(-2, 2)) if shake_left > 0.0 else Vector2.ZERO


func tick_typing(delta: float) -> void:
	if typing == null:
		return
	var t: Dictionary = typing
	var text: String = t.text
	var before := int(t.shown)
	t.shown = minf(text.length(), t.shown + delta * voice.speed)
	var now := int(t.shown)
	if now != before:
		draw_dialogue(text.substr(0, now), voice.color)
		if voice.pitch and now % 2 == 0 and not PUNCT.contains(text[now - 1]):
			sound.blip(voice.pitch * (0.94 + randf() * 0.12))
	if t.shown >= text.length():
		typing = null
		typed.emit()


func tick_writing(delta: float) -> void:
	if writing.is_empty():
		return
	var w: Dictionary = writing[0]
	var before: float = w.item.shown
	w.item.shown = minf(w.total, before + delta * WRITE_SPEED)
	if floori(w.item.shown / 16.0) != floori(before / 16.0):
		sound.pen()
	if w.item.shown >= w.total:
		writing.pop_front()
	page_dirty = true


func tick_portrait() -> void:
	var path := "booth/portrait-empty.png"
	var frame := 0
	if voice.portrait != null:
		path = "booth/portrait-%s.png" % voice.portrait
		if typing != null:
			frame = int(time_ms / 110.0) % 2
		elif fmod(time_ms, 3600.0) < 140.0:
			frame = 2
	var tex := Art.texture(path)
	if portrait.texture != tex:
		portrait.texture = tex
		portrait.hframes = 3 if voice.portrait != null else 1
	portrait.frame = frame
	var head: Variant = null
	if voice.head != null and (voice.head != "witness" or on_stand != null):
		head = L.HEADS[voice.head]
	tick_img.visible = head != null
	if head != null:
		tick_img.position = Vector2(head.x - 2, head.y - 8 - (int(time_ms / 320.0) % 2))


# —— 自動試玩讀的狀態：只讀，不改規則 ——

func state() -> Dictionary:
	var r := func(rect: Rect2i) -> Array: return [rect.position.x, rect.position.y, rect.size.x, rect.size.y]
	var out := {
		"trial": trial, "mode": mode, "busy": busy, "modal": modal.kind if modal != null else null,
		"stamping": stamping.wid if stamping != null else null, "typing": typing != null, "waiting": waiting,
		"stamp_mode": rack_mode(), "day": day, "slip": [SLIP.position.x, SLIP.position.y, SLIP.size.x, SLIP.size.y] if slip_available() else null,
		"slip_busy": slip_busy, "menu": menu.state() if menu.visible else null,
		"rack": {"x": roundi(rack_x), "ready": rack_ready}, "loupe": {"x": loupe.x, "y": loupe.y},
		"page": page_index, "pages": pages.size(), "stats": stats, "drag": drag.kind if drag != null else null,
		"muted": sound.muted, "stamp_busy": stamp_busy, "writing": writing.size(), "captions": captions.size(),
		"caption": caption.text if caption != null else null, "hint": hint(),
	}
	out.docs = docs.map(func(d: Dictionary) -> Dictionary:
		var s := size_of(d)
		return {"id": d.id, "slot": d.slot, "form": d.form, "on_desk": d.on_desk, "arriving": d.arriving, "x": d.x, "y": d.y, "w": s.x, "h": s.y})
	out.entryRects = entry_rects.map(func(e: Dictionary) -> Dictionary: return {"claim": e.claim, "row": r.call(e.row), "text": r.call(e.text)})
	out.items = items.map(func(i: Dictionary) -> Dictionary: return {"kind": i.kind, "id": i.id, "rect": r.call(i.rect)})
	var entries := []
	for p in pages:
		for e in p.entries:
			entries.append({
				"claim": e.claim,
				"notes": e.notes.map(func(n: Dictionary) -> Dictionary: return {"style": n.style, "text": n.str}),
				"imprints": e.imprints.map(func(i: Dictionary) -> Dictionary: return {"kind": i.kind, "crossed": i.crossed}),
			})
	out.entries = entries
	out.stamps = {}
	for kind in stamps:
		out.stamps[kind] = [int(stamps[kind].position.x), int(stamps[kind].position.y)]
	out.hotspots = Art.evidence()
	return out
