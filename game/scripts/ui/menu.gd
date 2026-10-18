# 選項框：一張紙蓋在畫面上，列出幾個選項，按一下其中一個。夜晚的選擇、評議室揀人揀證物、選票都用它。
# ask() 等到玩家揀了才回傳：選項的次序，或者 -1（取消）。
extends Node2D

signal picked(index: int)

const Pal := preload("res://scripts/pixel/palette.gd")
const Draw := preload("res://scripts/pixel/draw.gd")
const Text := preload("res://scripts/pixel/pixel_text.gd")

const W := 480
const H := 270

var sound: Node
var rows: Array = [] # 每個選項在遊戲座標的位置
var texts: Array = [] # 每個選項的字（自動試玩用來找選項）
var cancel_rect: Variant = null
var title := ""
var _sprite: Sprite2D


func _ready() -> void:
	z_index = 600
	visible = false
	_sprite = Sprite2D.new()
	_sprite.centered = false
	add_child(_sprite)


# options：[{text, note?}]。cancel 是取消鍵上的字，空字串就不能取消。
func ask(heading: String, options: Array, cancel := "", width := 300) -> int:
	title = heading
	texts = options.map(func(o: Dictionary) -> String: return String(o.text))
	_layout(options, cancel, width)
	visible = true
	var i: int = await picked
	visible = false
	return i


func _layout(options: Array, cancel: String, width: int) -> void:
	var parts: Array = []
	var head := Text.render(title, "bold", Pal.INK, width - 24, 15)
	var h: int = 10 + head.height + 6
	for o in options:
		var t := Text.render(String(o.text), "body", Pal.INK, width - 32, 15)
		var n: Variant = Text.render(String(o.note), "hand", Pal.GREY, width - 32, 13) if o.get("note", "") != "" else null
		var rh: int = t.height + (n.height if n != null else 0) + 6
		parts.append([t, n, rh])
		h += rh + 4
	var c: Variant = Text.render(cancel, "body", Pal.GREY, 0, 15) if cancel != "" else null
	if c != null:
		h += c.height + 6
	h += 6
	var x := floori((W - width) / 2.0)
	var y := maxi(4, floori((H - h) / 2.0))
	var img := Draw.canvas(W, H)
	Draw.dither(img, 0, 0, W, H, Pal.BLACK)
	Draw.dither(img, x + 3, y + 3, width, h, Pal.BLACK, 1)
	Draw.rect(img, x, y, width, h, Pal.PAPER)
	Draw.frame(img, x, y, width, h, Pal.PAPER_SHADE)
	Draw.blit(img, head.image, x + 12, y + 10)
	var ry: int = y + 10 + head.height + 6
	rows = []
	for p in parts:
		var r := Rect2i(x + 10, ry, width - 20, p[2])
		Draw.dotted_frame(img, r.position.x, r.position.y, r.size.x, r.size.y, Pal.PAPER_LINE)
		Draw.blit(img, p[0].image, r.position.x + 6, r.position.y + 3)
		if p[1] != null:
			Draw.blit(img, p[1].image, r.position.x + 6, r.position.y + 3 + p[0].height)
		rows.append(r)
		ry += p[2] + 4
	cancel_rect = null
	if c != null:
		cancel_rect = Rect2i(x + width - c.width - 14, ry + 2, c.width + 4, c.height)
		Draw.blit(img, c.image, x + width - c.width - 12, ry + 2)
	_sprite.texture = ImageTexture.create_from_image(img)


func _unhandled_input(event: InputEvent) -> void:
	if not visible:
		return
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		var p := Vector2i(event.position.floor())
		for i in rows.size():
			if rows[i].has_point(p):
				_choose(i)
				break
		if cancel_rect != null and cancel_rect.has_point(p):
			_choose(-1)
		get_viewport().set_input_as_handled()
	elif event is InputEventKey and event.pressed and not event.echo:
		var n: int = event.keycode - KEY_1
		if n >= 0 and n < rows.size():
			_choose(n)
		elif event.keycode == KEY_ESCAPE and cancel_rect != null:
			_choose(-1)
		get_viewport().set_input_as_handled()
	elif event is InputEventMouseButton or event is InputEventMouseMotion:
		get_viewport().set_input_as_handled()


func _choose(i: int) -> void:
	if sound:
		sound.paper()
	visible = false
	picked.emit(i)


func state() -> Dictionary:
	return {
		"title": title,
		"options": texts,
		"rows": rows.map(func(r: Rect2i) -> Array: return [r.position.x, r.position.y, r.size.x, r.size.y]),
		"cancel": [cancel_rect.position.x, cancel_rect.position.y, cancel_rect.size.x, cancel_rect.size.y] if cancel_rect != null else null,
	}
