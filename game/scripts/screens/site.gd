# 第四天：陪審團到福安樓視察現場。不能碰任何東西，但可以看：點一下你想看清楚的地方。
# 看到的東西就是證物 V1（視察現場的筆記）的細節；回到法院，V1 會放進你的托盤。
# greybox：樓梯口只用方塊交代；三處可以看的地方，位置在 SPOTS。
extends Node2D

signal left

const Pal := preload("res://scripts/pixel/palette.gd")
const Draw := preload("res://scripts/pixel/draw.gd")
const Text := preload("res://scripts/pixel/pixel_text.gd")
const Rules := preload("res://scripts/rules/rules.gd")
const CaseData := preload("res://scripts/rules/case_data.gd")
const Art := preload("res://scripts/desk/art.gd")
const TalkScript := preload("res://scripts/ui/talk.gd")

# 地下寫字樓的門腳、樓梯的燈座、站在樓梯口的保安
const SPOTS := {
	"V1a": Rect2i(352, 132, 52, 32),
	"V1b": Rect2i(150, 22, 26, 18),
	"V1c": Rect2i(84, 120, 30, 34),
}
const LEAVE := Rect2i(392, 170, 80, 17)

var sound: Node
var ui: Dictionary
var C: Dictionary
var trial: Dictionary
var talk: Node2D
var looking := false
var _bg: Sprite2D


func _ready() -> void:
	ui = JSON.parse_string(FileAccess.get_file_as_string("res://data/ui.json"))
	C = CaseData.data()
	_bg = Sprite2D.new()
	_bg.centered = false
	add_child(_bg)
	talk = TalkScript.new()
	talk.sound = sound
	add_child(talk)


func visit(t: Dictionary) -> void:
	trial = t
	looking = false
	draw()
	for beat in C.SITE.intro:
		await talk.say(beat)
	looking = true
	draw()
	talk.speak({"who": "旁白", "text": ui.site.look})
	await left
	looking = false
	draw()
	for beat in C.SITE.outro:
		await talk.say(beat)


func detail_text(id: String) -> String:
	for d in C.EXHIBITS.V1.details:
		if d.id == id:
			return d.text
	return ""


func look(id: String) -> void:
	if Rules.reveal_detail(trial, id):
		sound.found()
	draw()
	talk.speak({"who": "你", "text": detail_text(id)})


func draw() -> void:
	var img := Draw.canvas(480, 270)
	img.fill(Pal.PHOTO)
	# 牆、地台、樓梯
	Draw.rect(img, 0, 0, 480, 170, Pal.WALL_DARK)
	Draw.dither(img, 0, 0, 480, 90, Pal.BLACK)
	Draw.rect(img, 0, 170, 480, 100, Pal.GREY)
	for k in 7:
		Draw.rect(img, 20 + k * 22, 150 - k * 18, 30, 4, Pal.METAL)
		Draw.rect(img, 20 + k * 22, 154 - k * 18, 30, 14, Pal.WALL)
	Draw.line(img, 20, 120, 170, 10, Pal.METAL)
	# 燈座（沒有燈泡）
	Draw.rect(img, 158, 0, 2, 26, Pal.GREY)
	Draw.rect(img, 154, 26, 10, 6, Pal.WALL)
	# 地下寫字樓的門：門腳有一道向上燻的燒痕
	Draw.rect(img, 352, 60, 52, 104, Pal.WOOD_DARK)
	Draw.frame(img, 352, 60, 52, 104, Pal.GREY)
	Draw.rect(img, 360, 70, 36, 20, Pal.METAL)
	Draw.dither(img, 354, 136, 48, 26, Pal.BLACK)
	Draw.dither(img, 360, 118, 36, 18, Pal.BLACK, 1)
	# 保安
	Draw.blit(img, Art.image("court/witness-chung.png"), 86, 128)
	Draw.rect(img, 90, 150, 16, 20, Pal.KHAKI)
	# 封鎖線
	for x in range(0, 480, 12):
		Draw.rect(img, x, 168, 8, 2, Pal.BRASS_LIGHT)
	if looking:
		for id in SPOTS:
			var r: Rect2i = SPOTS[id]
			if trial.zoomed.get(id, false):
				Draw.frame(img, r.position.x, r.position.y, r.size.x, r.size.y, Pal.BRASS_LIGHT)
		Draw.rect(img, LEAVE.position.x, LEAVE.position.y, LEAVE.size.x, LEAVE.size.y, Pal.BRASS)
		Draw.frame(img, LEAVE.position.x, LEAVE.position.y, LEAVE.size.x, LEAVE.size.y, Pal.BRASS_DARK)
		Draw.blit(img, Text.render(ui.site.leave, "bold", Pal.INK, 0, 15).image, LEAVE.position.x + 10, LEAVE.position.y + 1)
	var t := Text.render(ui.places.site, "name", Pal.INK, 0, 14)
	Draw.rect(img, 6, 6, t.width + 10, 17, Pal.BRASS)
	Draw.blit(img, t.image, 11, 8)
	_bg.texture = ImageTexture.create_from_image(img)


func _unhandled_input(event: InputEvent) -> void:
	if not visible:
		return
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		var p := Vector2i(event.position.floor())
		if looking:
			if LEAVE.has_point(p):
				sound.clack()
				left.emit()
				get_viewport().set_input_as_handled()
				return
			for id in SPOTS:
				if SPOTS[id].has_point(p):
					look(id)
					get_viewport().set_input_as_handled()
					return
		talk.advance()
		get_viewport().set_input_as_handled()
	elif event is InputEventKey and event.pressed and not event.echo:
		if event.keycode in [KEY_SPACE, KEY_ENTER, KEY_KP_ENTER, KEY_RIGHT]:
			talk.advance()
			get_viewport().set_input_as_handled()


func state() -> Dictionary:
	var r := func(rect: Rect2i) -> Array: return [rect.position.x, rect.position.y, rect.size.x, rect.size.y]
	var spots := {}
	for id in SPOTS:
		spots[id] = r.call(SPOTS[id])
	return {"looking": looking, "spots": spots, "leave": r.call(LEAVE), "typing": talk.typing != null, "waiting": talk.waiting}
