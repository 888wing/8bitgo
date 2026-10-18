# 入口：畫面固定 480×270，畫在一個子視窗裡，按螢幕的實際像素放大（規則見 desk/fit.gd）。
# 完結頁按「再玩一次」，就換一張新的桌面。網頁版另外開一個只讀的接口給自動試玩：window.__desk.state()。
extends Node

const Fit := preload("res://scripts/desk/fit.gd")
const Text := preload("res://scripts/pixel/pixel_text.gd")
const Pal := preload("res://scripts/pixel/palette.gd")
const DeskScene := preload("res://scenes/desk.tscn")

const PAD_CSS := Vector2(16, 8) # 網頁版四邊留的位置（CSS 像素），手機橫放時高度最緊
const GAP_CSS := 8.0

var desk: Node2D
var k := 1.0
var dpr := 1.0
var touch := false
var reduced := false
var web := OS.has_feature("web")
var _js_callbacks: Array = []

@onready var sound: Node = $Sound
@onready var view: SubViewportContainer = $View
@onready var viewport: SubViewport = $View/Viewport
@onready var rotate_hint: TextureRect = $Rotate


func _ready() -> void:
	reduced = OS.get_cmdline_user_args().has("--reduce-motion")
	if web:
		touch = bool(JavaScriptBridge.eval("matchMedia('(pointer: coarse)').matches", true))
		reduced = reduced or bool(JavaScriptBridge.eval("matchMedia('(prefers-reduced-motion: reduce)').matches", true))
	else:
		touch = DisplayServer.is_touchscreen_available()
	var ui: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/ui.json"))
	rotate_hint.texture = ImageTexture.create_from_image(Text.render(ui.rotate, "body", Pal.WALL_LIGHT).image)
	if not web:
		_size_window()
	get_viewport().size_changed.connect(refit)
	new_desk()
	refit()
	if web:
		_expose()


func new_desk() -> void:
	if desk != null:
		viewport.remove_child(desk)
		desk.queue_free()
	desk = DeskScene.instantiate()
	desk.sound = sound
	desk.reduced = reduced
	desk.restart_requested.connect(new_desk, CONNECT_DEFERRED)
	desk.cursor_changed.connect(func(shape: int) -> void: view.mouse_default_cursor_shape = shape)
	viewport.add_child(desk)


# 桌面版：視窗開成螢幕可用範圍內最大的整數倍（留一成半給選單列和邊框）。
func _size_window() -> void:
	var screen := DisplayServer.window_get_current_screen()
	var usable := DisplayServer.screen_get_usable_rect(screen)
	var n := maxi(1, floori(minf(usable.size.x * 0.85 / Fit.W, usable.size.y * 0.85 / Fit.H)))
	var size := Vector2i(int(Fit.W) * n, int(Fit.H) * n)
	DisplayServer.window_set_size(size)
	DisplayServer.window_set_position(usable.position + (usable.size - size) / 2)


# F11：全螢幕（1080p 剛好 ×4）。
func _input(event: InputEvent) -> void:
	if not web and event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_F11:
		var full := DisplayServer.window_get_mode() == DisplayServer.WINDOW_MODE_FULLSCREEN
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED if full else DisplayServer.WINDOW_MODE_FULLSCREEN)
		get_viewport().set_input_as_handled()


func device_pixel_ratio() -> float:
	if web:
		return float(JavaScriptBridge.eval("window.devicePixelRatio || 1", true))
	return DisplayServer.screen_get_scale()


# 手機直放時，畫面上面多一行「把手機橫放」；整組（提示和畫面）上下置中。
func refit() -> void:
	var win := get_viewport().get_visible_rect().size
	dpr = device_pixel_ratio()
	var pad := PAD_CSS * dpr if web else Vector2.ZERO
	var notice := 0.0
	rotate_hint.visible = Fit.wants_rotate(win, dpr)
	var r := maxf(1.0, roundf(dpr))
	if rotate_hint.visible:
		rotate_hint.scale = Vector2(r, r)
		notice = rotate_hint.texture.get_height() * r + GAP_CSS * dpr
	k = Fit.scale_for(win - pad * 2.0 - Vector2(0, notice), touch)
	var size := Vector2(Fit.W, Fit.H) * k
	var top := floorf((win.y - size.y - notice) / 2.0)
	view.scale = Vector2(k, k)
	view.position = Vector2(floorf((win.x - size.x) / 2.0), top + notice)
	rotate_hint.position = Vector2(floorf((win.x - rotate_hint.texture.get_width() * r) / 2.0), top)


# —— 自動試玩用：讀狀態，不改規則 ——

func state() -> Dictionary:
	var s: Dictionary = desk.state()
	var win := get_viewport().get_visible_rect().size
	s.view = {"x": view.position.x, "y": view.position.y, "k": k, "w": win.x, "h": win.y, "dpr": dpr, "touch": touch, "rotate": rotate_hint.visible}
	return s


func _expose() -> void:
	var cb := JavaScriptBridge.create_callback(_write_state)
	_js_callbacks.append(cb)
	JavaScriptBridge.get_interface("window").__deskStateCb = cb
	JavaScriptBridge.eval("window.__desk = { state() { window.__deskStateCb(); return JSON.parse(window.__deskOut); } };", true)


func _write_state(_args: Array) -> void:
	JavaScriptBridge.get_interface("window").__deskOut = JSON.stringify(state())
