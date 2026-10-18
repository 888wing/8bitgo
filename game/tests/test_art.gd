# 美術規範（docs/06-art.md）的自動檢查：32 色、沒有半透明、尺寸對得上版面、字表齊全。
extends "res://tests/suite.gd"

const Pal := preload("res://scripts/pixel/palette.gd")
const Text := preload("res://scripts/pixel/pixel_text.gd")
const L := preload("res://scripts/desk/layout.gd")
const Art := preload("res://scripts/desk/art.gd")

const STYLES := ["dialogue", "name", "hand", "body", "bold", "title", "heading", "small"]


static func _snake(camel: String) -> String:
	var out := ""
	for ch in camel:
		out += ("_" + ch) if ch == ch.to_upper() else ch.to_upper()
	return out


func _palette() -> Dictionary:
	return JSON.parse_string(FileAccess.get_file_as_string("res://art/palette.json"))


func _pngs(dir: String, out: Array[String] = []) -> Array[String]:
	for f in DirAccess.get_files_at(dir):
		if f.ends_with(".png"):
			out.append(dir.path_join(f))
	for d in DirAccess.get_directories_at(dir):
		_pngs(dir.path_join(d), out)
	return out


func _image(path: String) -> Image:
	var img: Image = (load(path) as Texture2D).get_image()
	img.convert(Image.FORMAT_RGBA8)
	return img


func test_palette() -> void:
	about("調色盤：palette.gd 和 art/palette.json 一致，剛好 32 種不同的顏色")
	var json := _palette()
	var consts := (Pal as Script).get_script_constant_map()
	var seen := {}
	for key in json:
		var name := _snake(key)
		check(consts.has(name), "palette.gd 沒有 %s" % name)
		if consts.has(name):
			eq(consts[name].to_html(false), String(json[key]).substr(1), name)
		seen[String(json[key]).to_lower()] = true
	eq(seen.size(), 32, "不同的顏色")


func test_png_palette() -> void:
	about("美術：art/ 裡每張圖只用 32 色，每一點不是全透明就是全不透明")
	var allowed := {}
	for hex in _palette().values():
		allowed[Color(hex).to_rgba32() | 0xFF] = true
	var files := _pngs("res://art")
	check(files.size() > 40, "找不到美術：%d 張" % files.size())
	for path in files:
		var data := _image(path).get_data()
		var bad := 0
		var mask := path.contains("/fonts/")
		for i in range(0, data.size(), 4):
			var a := data[i + 3]
			if a == 0:
				continue
			if a != 255:
				bad += 1
			elif not mask and not allowed.has((data[i] << 24) | (data[i + 1] << 16) | (data[i + 2] << 8) | 0xFF):
				bad += 1
		check(bad == 0, "%s 有 %d 點不合規" % [path, bad])


func test_evidence() -> void:
	about("證物：每個細節都標了位置，在證物範圍之內；原大、兩倍、小圖的尺寸對得上")
	var exhibits: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/case.json")).EXHIBITS
	for id in Art.evidence():
		var size := Art.doc_size(id)
		eq(Vector2i(_image("res://art/evidence/%s.png" % id).get_size()), size, "%s 原大" % id)
		eq(Vector2i(_image("res://art/evidence/%s-zoom.png" % id).get_size()), size * 2, "%s 兩倍" % id)
		eq(Vector2i(_image("res://art/evidence/%s-icon.png" % id).get_size()), Vector2i(24, 18), "%s 小圖" % id)
		for d in exhibits[id].details:
			var r: Variant = Art.hotspot(id, d.id)
			check(r != null, "%s 沒有位置" % d.id)
			if r != null:
				check(Rect2i(Vector2i.ZERO, size).encloses(r), "%s 超出 %s 的範圍" % [d.id, id])


func test_layout_sizes() -> void:
	about("版面：每張圖剛好放進它在版面上的位置")
	var expect := {
		"court/court.png": L.COURT.size, "booth/booth.png": L.BOOTH.size, "desk/desk.png": L.DESK.size,
		"desk/notebook.png": L.NOTEBOOK.size, "desk/tray.png": L.TRAY.size, "desk/plaque-inspect.png": L.INSPECT.size,
		"desk/plaque-inspect-on.png": L.INSPECT.size, "desk/plaque-booklet.png": L.BOOKLET.size,
		"desk/arrow-left.png": L.PAGE_PREV.size, "desk/arrow-right.png": L.PAGE_NEXT.size,
		"rack/rack.png": Vector2i(L.RACK_W, L.RACK_H), "ui/sound-on.png": L.SOUND.size, "ui/sound-off.png": L.SOUND.size,
		"booth/portrait-empty.png": Vector2i(56, 60), "court/witness-cheng.png": Vector2i(24, 22),
		"court/witness-chung.png": Vector2i(24, 22), "rack/stamp-trust.png": Vector2i(26, 34),
		"rack/stamp-doubt.png": Vector2i(26, 34), "rack/imprint-trust.png": Vector2i(22, 22),
		"rack/imprint-doubt.png": Vector2i(22, 22), "desk/loupe.png": Vector2i(64, 64),
	}
	for who in ["judge", "prosecutor", "defense", "cheng", "usher", "chung"]:
		expect["booth/portrait-%s.png" % who] = Vector2i(56 * 3, 60)
	for path in expect:
		eq(Vector2i(_image("res://art/" + path).get_size()), expect[path], path)


static func _strings(v: Variant, out: Array) -> void:
	match typeof(v):
		TYPE_STRING:
			out.append(v)
		TYPE_ARRAY:
			for x in v:
				_strings(x, out)
		TYPE_DICTIONARY:
			for x in v.values():
				_strings(x, out)


func test_glyphs() -> void:
	about("點陣字：案件資料和介面用到的每一個字，每款字表都有")
	var all: Array = []
	for f in ["res://data/case.json", "res://data/ui.json"]:
		_strings(JSON.parse_string(FileAccess.get_file_as_string(f)), all)
	var chars := {}
	for s in all:
		for ch in s:
			chars[ch] = true
	for ch in "0123456789/":
		chars[ch] = true
	var ui: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/ui.json"))
	# 大字只用在標題和完結頁的小標題
	var only := {"title": ui.title, "heading": ui.end.title}
	for style in STYLES:
		var need: Array = Array(only[style].split("")) if only.has(style) else chars.keys()
		var missing := need.filter(func(ch: String) -> bool: return not Text.has_glyph(style, ch))
		check(missing.is_empty(), "%s 字表缺：%s（執行 npm run bake）" % [style, "".join(missing)])


func test_text_matches_browser() -> void:
	about("點陣字：逐個字拼出來的結果，跟瀏覽器整句畫的一樣")
	var samples: Array = JSON.parse_string(FileAccess.get_file_as_string("res://tests/fixtures/text/samples.json"))
	for s in samples:
		var want := _image("res://tests/fixtures/text/" + s.file)
		var got: Image = Text.render(s.text, s.style, Pal.WHITE, int(s.width), int(s.lineHeight)).image
		if got.get_size() != want.get_size():
			failures.append("%s：尺寸 %s，瀏覽器是 %s" % [s.text, got.get_size(), want.get_size()])
			continue
		var diff := 0
		for y in want.get_height():
			for x in want.get_width():
				if (got.get_pixel(x, y).a > 0.5) != (want.get_pixel(x, y).a > 0.5):
					diff += 1
		check(diff == 0, "%s（%s）：%d 點不同" % [s.text, s.style, diff])
