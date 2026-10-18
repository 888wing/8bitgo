# 美術的入口：art/ 裡的 PNG 由 npm run bake 從 art/src 的畫法輸出，換正式美術時直接換檔案。
# 這裡另外即場做幾樣跟畫面狀態有關的東西：每一下都不同的印、鏡片的圓形、網點陰影。
extends RefCounted

const Draw := preload("res://scripts/pixel/draw.gd")
const Pal := preload("res://scripts/pixel/palette.gd")

static var _images := {}
static var _textures := {}
static var _evidence := {}


static func texture(path: String) -> Texture2D:
	return load("res://art/" + path)


# CPU 上用的圖（鏡片要從兩倍圖剪一塊出來）。
static func image(path: String) -> Image:
	if not _images.has(path):
		var img := texture(path).get_image()
		img.convert(Image.FORMAT_RGBA8)
		_images[path] = img
	return _images[path]


# 證物的尺寸、名字和細節位置：art/evidence/evidence.json，來源是 art/src/evidence.js 的 EVIDENCE。
static func evidence() -> Dictionary:
	if _evidence.is_empty():
		_evidence = JSON.parse_string(FileAccess.get_file_as_string("res://art/evidence/evidence.json"))
	return _evidence


static func doc_size(id: String) -> Vector2i:
	var e: Dictionary = evidence()[id]
	return Vector2i(int(e.w), int(e.h))


static func hotspot(id: String, detail: String) -> Variant:
	var spots: Dictionary = evidence()[id].hotspots
	if not spots.has(detail):
		return null
	var s: Array = spots[detail]
	return Rect2i(int(s[0]), int(s[1]), int(s[2]), int(s[3]))


# 每一下蓋出來的印都不一樣：邊框和字有隨機的缺墨。
static func imprint(kind: String) -> Image:
	var img: Image = image("rack/imprint-%s.png" % kind).duplicate()
	for y in img.get_height():
		for x in img.get_width():
			if img.get_pixel(x, y).a > 0.0 and randf() < 0.09:
				img.set_pixel(x, y, Draw.CLEAR)
	return img


# 放大鏡的鏡片形狀：圓內不透明，邊緣沒有半透明的點。
static func disc(r: int) -> Image:
	var img := Draw.canvas(r * 2 + 1, r * 2 + 1)
	for y in range(-r, r + 1):
		for x in range(-r, r + 1):
			if x * x + y * y <= (r - 0.5) * (r - 0.5):
				img.set_pixel(x + r, y + r, Pal.BLACK)
	return img


# 陰影是半格網點，拿起來時離紙遠一點。
static func shadow(w: int, h: int) -> Texture2D:
	var key := "%dx%d" % [w, h]
	if not _textures.has(key):
		var img := Draw.canvas(w, h)
		Draw.dither(img, 0, 0, w, h, Pal.BLACK)
		_textures[key] = ImageTexture.create_from_image(img)
	return _textures[key]
