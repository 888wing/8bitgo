# 點陣字：用 npm run bake 輸出的字表（art/fonts/<字款>.png 和 .json）逐個字拼出來。
# 每個字已經在瀏覽器壓成全有或全無的點，而且按 0、¼、½、¾ 像素的位置各畫了一次；
# 排字時把位置取到最接近的 ¼ 像素，用對應的一格。結果跟瀏覽器整句畫的逐點相同（tests/test_art.gd）。
# 字表沒有的字會變成空格，並記在 missing 裡；tests/test_art.gd 檢查案件和介面用到的字全部都有。
extends RefCounted

const Draw := preload("res://scripts/pixel/draw.gd")

# 句號、逗號、引號的後半不放行首。
const CLOSERS := "，。、；：？！」』）》…"

static var _fonts := {}
static var missing := {}


static func font(style: String) -> Dictionary:
	if not _fonts.has(style):
		var meta: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://art/fonts/%s.json" % style))
		var tex: Texture2D = load("res://art/fonts/%s.png" % style)
		var atlas := tex.get_image()
		atlas.convert(Image.FORMAT_RGBA8)
		_fonts[style] = {"meta": meta, "atlas": atlas, "colored": {}}
	return _fonts[style]


static func size_of(style: String) -> int:
	return int(font(style).meta.size)


static func has_glyph(style: String, ch: String) -> bool:
	return font(style).meta.glyphs.has(ch)


static func advance(style: String, ch: String) -> float:
	var g: Variant = font(style).meta.glyphs.get(ch)
	if g == null:
		missing[ch] = true
		return float(size_of(style))
	return float(g[2])


static func measure(style: String, text: String) -> float:
	var w := 0.0
	for ch in text:
		w += advance(style, ch)
	return w


# 把漢字按寬度斷行；句號、逗號、引號收尾的字不會落在行首。
static func wrap_lines(style: String, text: String, width: float) -> PackedStringArray:
	var lines := PackedStringArray()
	for para in text.split("\n"):
		var current := ""
		var w := 0.0
		for ch in para:
			var a := advance(style, ch)
			if current != "" and w + a > width and not CLOSERS.contains(ch):
				lines.append(current)
				current = ch
				w = a
			else:
				current += ch
				w += a
		lines.append(current)
	return lines


# 同一種顏色的字表只做一次：把字的點塗上這個顏色。
static func _colored(style: String, color: Color) -> Image:
	var f := font(style)
	var key := color.to_html()
	if not f.colored.has(key):
		var atlas: Image = f.atlas
		var solid := Image.create_empty(atlas.get_width(), atlas.get_height(), false, Image.FORMAT_RGBA8)
		solid.fill(color)
		var out := Image.create_empty(atlas.get_width(), atlas.get_height(), false, Image.FORMAT_RGBA8)
		out.blit_rect_mask(solid, atlas, Rect2i(Vector2i.ZERO, atlas.get_size()), Vector2i.ZERO)
		f.colored[key] = out
	return f.colored[key]


# 跟舊版的 P.text 一樣：回傳一張圖和每一行的寬度（筆記本逐行把字露出來時要用）。
static func render(text: String, style: String, color: Color, width := 0, line_height := 0) -> Dictionary:
	var f := font(style)
	var meta: Dictionary = f.meta
	var size := int(meta.size)
	var lh := line_height if line_height > 0 else size + 3
	var lines: PackedStringArray = wrap_lines(style, text, width) if width > 0 else text.split("\n")
	var widths: Array[int] = []
	var w := maxi(width, 1)
	for l in lines:
		var lw := ceili(measure(style, l)) + 1
		widths.append(lw)
		w = maxi(w, lw)
	var img := Draw.canvas(w + 2, lines.size() * lh)
	var atlas := _colored(style, color)
	var pad := int(meta.pad)
	var phases := float(meta.phases)
	var cell := Vector2i(int(meta.cell[0]), int(meta.cell[1]))
	var top := floori((lh - size) / 2.0)
	for i in lines.size():
		var pen := 0.0
		for ch in lines[i]:
			var g: Variant = meta.glyphs.get(ch)
			if g == null:
				missing[ch] = true
				pen += size
				continue
			var q := roundf(pen * phases) / phases
			var ix := floori(q)
			var k := roundi((q - ix) * phases)
			img.blend_rect(atlas, Rect2i(int(g[0]) + k * cell.x, int(g[1]), cell.x, cell.y), Vector2i(ix - pad, i * lh + top - pad))
			pen += float(g[2])
	return {"image": img, "lines": lines, "widths": widths, "line_height": lh, "width": img.get_width(), "height": img.get_height()}
