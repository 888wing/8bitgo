# 畫面永遠是 480×270，按螢幕實際像素的整數倍放大：每一個像素都是同樣大小的方格。
# 唯一例外：觸控螢幕上，每個像素已經有三個或以上實際像素，而整數倍會浪費超過 15% 位置時，
# 改用剛好放得下的倍數（docs/06-art.md §2）。全部用實際像素計算。
extends RefCounted

const W := 480.0
const H := 270.0


# avail：放得下畫面的空間（實際像素）。回傳放大倍數。
static func scale_for(avail: Vector2, touch: bool) -> float:
	var best := minf(avail.x / W, avail.y / H)
	var k := maxf(1.0, floorf(best))
	if touch and best >= 3.0 and best / k > 1.15:
		k = best
	return k


# 手機直放時提示玩家橫放：畫面比闊度高，而且闊度不到 700 個 CSS 像素。
static func wants_rotate(window: Vector2, dpr: float) -> bool:
	return window.y > window.x and window.x / dpr < 700.0
