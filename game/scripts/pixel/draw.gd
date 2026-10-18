# 在 Image 上逐點作畫：方塊、框、網點、一像素粗的直線。沒有半透明的邊。
extends RefCounted

const CLEAR := Color(0, 0, 0, 0)


static func canvas(w: int, h: int) -> Image:
	return Image.create_empty(maxi(1, w), maxi(1, h), false, Image.FORMAT_RGBA8)


static func rect(img: Image, x: int, y: int, w: int, h: int, color: Color) -> void:
	if w > 0 and h > 0:
		img.fill_rect(Rect2i(x, y, w, h), color)


static func px(img: Image, x: int, y: int, color: Color) -> void:
	if x >= 0 and y >= 0 and x < img.get_width() and y < img.get_height():
		img.set_pixel(x, y, color)


static func frame(img: Image, x: int, y: int, w: int, h: int, color: Color) -> void:
	rect(img, x, y, w, 1, color)
	rect(img, x, y + h - 1, w, 1, color)
	rect(img, x, y, 1, h, color)
	rect(img, x + w - 1, y, 1, h, color)


# 棋盤格網點：像素畫的半色調。
static func dither(img: Image, x: int, y: int, w: int, h: int, color: Color, phase := 0) -> void:
	for j in h:
		for i in w:
			if (i + j + phase) % 2 == 0:
				px(img, x + i, y + j, color)


static func dotted_line(img: Image, x: int, y: int, w: int, color: Color) -> void:
	for i in range(0, w, 2):
		px(img, x + i, y, color)


static func dotted_frame(img: Image, x: int, y: int, w: int, h: int, color: Color) -> void:
	for i in range(0, w, 2):
		px(img, x + i, y, color)
		px(img, x + i, y + h - 1, color)
	for j in range(0, h, 2):
		px(img, x, y + j, color)
		px(img, x + w - 1, y + j, color)


# 一像素粗的直線（Bresenham）。給要逐點畫出來的動畫用。
static func line_points(x0: int, y0: int, x1: int, y1: int) -> Array[Vector2i]:
	var x := x0
	var y := y0
	var dx := absi(x1 - x)
	var dy := -absi(y1 - y)
	var sx := 1 if x < x1 else -1
	var sy := 1 if y < y1 else -1
	var err := dx + dy
	var points: Array[Vector2i] = []
	while true:
		points.append(Vector2i(x, y))
		if x == x1 and y == y1:
			break
		var e2 := 2 * err
		if e2 >= dy:
			err += dy
			x += sx
		if e2 <= dx:
			err += dx
			y += sy
	return points


static func line(img: Image, x0: int, y0: int, x1: int, y1: int, color: Color) -> void:
	for p in line_points(x0, y0, x1, y1):
		px(img, p.x, p.y, color)


# 圓環上的點（圓心在 0, 0）。
static func ring_points(r: int, width := 1) -> Array[Vector2i]:
	var points: Array[Vector2i] = []
	for y in range(-r, r + 1):
		for x in range(-r, r + 1):
			var d := sqrt(x * x + y * y)
			if d <= r + 0.5 and d > r - width + 0.5 - 1:
				points.append(Vector2i(x, y))
	return points


# 把 src 疊上 dst：src 只有全透明和全不透明的點，所以結果沒有半透明。
static func blit(dst: Image, src: Image, x: int, y: int) -> void:
	dst.blend_rect(src, Rect2i(Vector2i.ZERO, src.get_size()), Vector2i(x, y))


# 只畫 src 左邊 w 點、上面 h 點。
static func blit_part(dst: Image, src: Image, sx: int, sy: int, w: int, h: int, x: int, y: int) -> void:
	if w > 0 and h > 0:
		dst.blend_rect(src, Rect2i(sx, sy, w, h), Vector2i(x, y))
