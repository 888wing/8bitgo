# 故事頁：序幕、早晨、夜晚、裁決和尾聲。上面是地點的佔位背景，下面是對白框；夜晚有選擇。
# greybox：背景只用幾塊顏色交代地點，正式美術見 docs/03-feel.md §5（法庭、評議室、當舖閣樓、早晨的街、案發現場）。
extends Node2D

const Pal := preload("res://scripts/pixel/palette.gd")
const Draw := preload("res://scripts/pixel/draw.gd")
const Text := preload("res://scripts/pixel/pixel_text.gd")
const Art := preload("res://scripts/desk/art.gd")
const TalkScript := preload("res://scripts/ui/talk.gd")
const MenuScript := preload("res://scripts/ui/menu.gd")

signal opened

var sound: Node
var ui: Dictionary
var place := ""
var label := ""
var talk: Node2D
var menu: Node2D
var card: Variant = null # 標題的傳票：按「打開傳票」的位置
var _bg: Sprite2D


func _ready() -> void:
	ui = JSON.parse_string(FileAccess.get_file_as_string("res://data/ui.json"))
	_bg = Sprite2D.new()
	_bg.centered = false
	add_child(_bg)
	talk = TalkScript.new()
	talk.sound = sound
	add_child(talk)
	menu = MenuScript.new()
	menu.sound = sound
	add_child(menu)


# 換地點：place 是 court、room、night、morning、site、bench、title 其中一個。
func show_place(p: String, text: String) -> void:
	place = p
	label = text
	card = null
	talk.visible = p != "title"
	talk.clear()
	_bg.texture = ImageTexture.create_from_image(backdrop(p, text))


func play(beats: Array) -> void:
	for beat in beats:
		await talk.say(beat)


func choose(prompt: String, options: Array) -> int:
	return await menu.ask(prompt, options)


# 標題：一張陪審員傳票。按「打開傳票」開始。
func title() -> void:
	show_place("title", "")
	var t: Dictionary = ui.summons
	var img: Image = backdrop("title", "")
	var x := 96
	var y := 30
	var w := 288
	var h := 210
	Draw.dither(img, x + 3, y + 3, w, h, Pal.BLACK)
	Draw.rect(img, x, y, w, h, Pal.PAPER)
	Draw.frame(img, x, y, w, h, Pal.PAPER_SHADE)
	Draw.frame(img, x + 4, y + 4, w - 8, h - 8, Pal.PAPER_LINE)
	var put := func(t2: Dictionary, ty: int) -> void: Draw.blit(img, t2.image, x + floori((w - t2.width) / 2.0), ty)
	put.call(Text.render(t.eyebrow, "name", Pal.GREY, 0, 14), y + 14)
	put.call(Text.render(ui.title, "title", Pal.INK, 0, 28), y + 36)
	put.call(Text.render(t.lede, "body", Pal.INK, w - 48, 15), y + 76)
	put.call(Text.render(t.note, "body", Pal.GREY, w - 48, 15), y + 136)
	var b := Text.render(t.open, "bold", Pal.INK, 0, 15)
	var bw: int = b.width + 20
	var bx := x + floori((w - bw) / 2.0)
	var by := y + h - 32
	Draw.rect(img, bx, by, bw, 17, Pal.BRASS)
	Draw.frame(img, bx, by, bw, 17, Pal.BRASS_DARK)
	Draw.rect(img, bx + 1, by + 1, bw - 2, 1, Pal.BRASS_LIGHT)
	Draw.blit(img, b.image, bx + 10, by + 1)
	card = Rect2i(bx, by, bw, 17)
	_bg.texture = ImageTexture.create_from_image(img)
	await opened
	card = null


func backdrop(p: String, text: String) -> Image:
	var img := Draw.canvas(480, 270)
	match p:
		"court":
			img.fill(Pal.WALL_DARK)
			Draw.blit(img, Art.image("court/court.png"), 0, 0)
			Draw.dither(img, 0, 96, 480, 174, Pal.PANEL)
		"room":
			img.fill(Pal.WALL)
			Draw.rect(img, 40, 24, 260, 140, Pal.PANEL)
			Draw.frame(img, 38, 22, 264, 144, Pal.WOOD)
			Draw.rect(img, 330, 30, 110, 90, Pal.WALL_DARK)
			Draw.dither(img, 332, 32, 106, 86, Pal.INK)
			Draw.rect(img, 0, 166, 480, 104, Pal.WOOD_DARK)
		"night":
			img.fill(Pal.INK)
			Draw.rect(img, 300, 20, 140, 100, Pal.WALL_DARK)
			Draw.dither(img, 302, 22, 136, 96, Pal.INK, 1)
			for i in 12:
				Draw.line(img, 306 + i * 11, 24, 300 + i * 11, 114, Pal.WALL)
			Draw.rect(img, 0, 140, 480, 130, Pal.WOOD_DARK)
			Draw.rect(img, 40, 120, 220, 24, Pal.WOOD)
			Draw.rect(img, 40, 120, 220, 2, Pal.WOOD_LIGHT)
		"morning":
			img.fill(Pal.WALL_LIGHT)
			Draw.rect(img, 0, 120, 480, 150, Pal.WALL_DARK)
			Draw.rect(img, 60, 70, 200, 60, Pal.SUIT)
			Draw.rect(img, 70, 78, 180, 20, Pal.PAPER_SHADE)
			Draw.rect(img, 330, 60, 90, 70, Pal.PAPER)
			Draw.frame(img, 330, 60, 90, 70, Pal.GREY)
		"site":
			img.fill(Pal.PHOTO)
			Draw.dither(img, 0, 0, 480, 190, Pal.BLACK)
		"bench":
			img.fill(Pal.WALL)
			Draw.rect(img, 0, 150, 480, 120, Pal.WALL_DARK)
			Draw.rect(img, 120, 130, 240, 10, Pal.WOOD)
			Draw.rect(img, 130, 140, 6, 20, Pal.WOOD_DARK)
			Draw.rect(img, 344, 140, 6, 20, Pal.WOOD_DARK)
		"title":
			img.fill(Pal.INK)
			Draw.dither(img, 0, 0, 480, 270, Pal.BLACK)
	if text != "":
		var t := Text.render(text, "name", Pal.INK, 0, 14)
		Draw.rect(img, 6, 6, t.width + 10, 17, Pal.BRASS)
		Draw.frame(img, 6, 6, t.width + 10, 17, Pal.BRASS_DARK)
		Draw.blit(img, t.image, 11, 8)
	return img


func _unhandled_input(event: InputEvent) -> void:
	if not visible or menu.visible:
		return
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		var p := Vector2i(event.position.floor())
		if card != null:
			if card.has_point(p):
				sound.paper()
				opened.emit()
			return
		talk.advance()
		get_viewport().set_input_as_handled()
	elif event is InputEventKey and event.pressed and not event.echo:
		if event.keycode in [KEY_SPACE, KEY_ENTER, KEY_KP_ENTER, KEY_RIGHT]:
			if card != null:
				opened.emit()
			else:
				talk.advance()
			get_viewport().set_input_as_handled()


func state() -> Dictionary:
	return {
		"place": place, "label": label, "typing": talk.typing != null, "waiting": talk.waiting,
		"card": [card.position.x, card.position.y, card.size.x, card.size.y] if card != null else null,
		"menu": menu.state() if menu.visible else null,
	}
