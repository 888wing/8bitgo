# 對白框：一句一句打字出來，按一下或空白鍵聽下一句。故事頁、評議室、視察現場和結局都用它。
# 桌面有自己的對白框（左下的特寫和名牌），規則一樣。
extends Node2D

signal typed
signal advanced

const Pal := preload("res://scripts/pixel/palette.gd")
const Draw := preload("res://scripts/pixel/draw.gd")
const Text := preload("res://scripts/pixel/pixel_text.gd")
const Speakers := preload("res://scripts/ui/speakers.gd")

const PUNCT := "，。、；：？！「」『』（）…—"

var rect := Rect2i(8, 196, 464, 66) # 對白框的位置（遊戲座標）
var sound: Node
var typing: Variant = null
var waiting := false
var voice: Dictionary = {}
var time_ms := 0.0
var _sprite: Sprite2D
var _more: Sprite2D


func _ready() -> void:
	_sprite = Sprite2D.new()
	_sprite.centered = false
	add_child(_sprite)
	_more = Sprite2D.new()
	_more.centered = false
	_more.texture = load("res://art/booth/more.png")
	_more.visible = false
	add_child(_more)
	clear()


func clear() -> void:
	typing = null
	waiting = false
	_draw_box("", "", Pal.WHITE)


func say(beat: Dictionary) -> void:
	speak(beat)
	await typed
	waiting = true
	await advanced


func speak(beat: Dictionary) -> void:
	voice = Speakers.voice(beat.who)
	waiting = false
	typing = {"text": String(beat.text), "shown": 0.0}
	_draw_box(voice.name, "", voice.color)


func advance() -> void:
	if typing != null:
		# 跳過打字：即刻畫出整句。_process 只在字數變了才重畫，這裡不畫就會停在打到一半的字
		typing.shown = float(typing.text.length())
		_draw_box(voice.name, typing.text, voice.color)
		return
	if waiting:
		waiting = false
		advanced.emit()


func busy() -> bool:
	return typing != null or waiting


func _process(delta: float) -> void:
	time_ms += delta * 1000.0
	_more.visible = visible and waiting and typing == null and int(time_ms / 400.0) % 2 == 0
	_more.position = Vector2(rect.end.x - 12, rect.end.y - 8)
	if typing == null:
		return
	var t: Dictionary = typing
	var text: String = t.text
	var before := int(t.shown)
	t.shown = minf(text.length(), t.shown + delta * float(voice.speed))
	var now := int(t.shown)
	if now != before:
		_draw_box(voice.name, text.substr(0, now), voice.color)
		if sound and voice.pitch and now % 2 == 0 and not PUNCT.contains(text[now - 1]):
			sound.blip(voice.pitch * (0.94 + randf() * 0.12))
	if t.shown >= text.length():
		typing = null
		typed.emit()


func _draw_box(name: String, text: String, color: Color) -> void:
	var img := Draw.canvas(rect.size.x, rect.size.y)
	Draw.rect(img, 0, 0, rect.size.x, rect.size.y, Pal.PANEL)
	Draw.frame(img, 0, 0, rect.size.x, rect.size.y, Pal.WALL)
	Draw.frame(img, 1, 1, rect.size.x - 2, rect.size.y - 2, Pal.BLACK)
	var y := 5
	if name != "":
		Draw.blit(img, Text.render(name, "name", Pal.BRASS_LIGHT, 0, 13).image, 8, y)
		y += 15
	if text != "":
		Draw.blit(img, Text.render(text, "dialogue", color, rect.size.x - 20, 16).image, 8, y)
	_sprite.texture = ImageTexture.create_from_image(img)
	_sprite.position = Vector2(rect.position)
