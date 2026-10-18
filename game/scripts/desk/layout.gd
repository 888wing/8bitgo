# 480×270 的版面（docs/06-art.md §5）。上面是法庭，左下是證人特寫和對白，右下是你的陪審桌。
# 美術的尺寸跟這裡對應：tests/test_art.gd 檢查每張圖放得進它的位置。
extends RefCounted

const W := 480
const H := 270

const COURT := Rect2i(0, 0, 480, 96)
const SOUND := Rect2i(463, 3, 14, 12)
const CAPTION := Rect2i(152, 56, 326, 38)

const BOOTH := Rect2i(0, 96, 150, 174)
const PORTRAIT := Rect2i(43, 101, 64, 66)
const NAME := Rect2i(6, 170, 138, 14)
const DIALOGUE := Rect2i(6, 186, 138, 80)

const DESK := Rect2i(150, 96, 330, 174)
const NOTEBOOK := Rect2i(154, 100, 172, 148)
const PAGE := Rect2i(160, 110, 160, 130)
const TRAY := Rect2i(330, 100, 146, 28)
const SLOTS := Vector2i(364, 105)
const SLOT_STEP := 28
const DOC_AREA := Rect2i(150, 96, 330, 154)

# 桌邊的工具槽：按鈕的感應範圍是整條槽的高度。
const STRIP_Y := 250
const STRIP_H := 20
const INSPECT := Rect2i(154, 253, 44, 15)
const BOOKLET := Rect2i(202, 253, 44, 15)
const PAGE_PREV := Rect2i(250, 253, 18, 15)
const PAGE_NEXT := Rect2i(270, 253, 18, 15)
const PAGE_NO := Rect2i(292, 256, 24, 10)

# 放大鏡：LOUPE_HOME 是鏡片中心；鏡片中心只可以在 LOUPE_BOUNDS 裡移動。
const LOUPE_HOME := Vector2i(352, 228)
const LOUPE_R := 20
const LENS_R := 19
const LOUPE_BOUNDS := Rect2i(171, 117, 289, 133)

const RACK_Y := 134
const RACK_W := 52
const RACK_H := 104
const RACK_SHOWN_X := 426
const RACK_HIDDEN_X := 484
const RACK_SLOTS := {"trust": Vector2i(13, 6), "doubt": Vector2i(13, 46)}
const RACK_LEAVE := Rect2i(4, 85, 44, 15)

# 法庭裡各人的頭頂，說話時在這裡閃一下。
const HEADS := {
	"judge": Vector2i(240, 12), "witness": Vector2i(90, 27), "prosecutor": Vector2i(184, 53),
	"defense": Vector2i(296, 53), "usher": Vector2i(131, 43), "defendant": Vector2i(396, 43),
}


static func inside(r: Rect2i, x: int, y: int) -> bool:
	return x >= r.position.x and y >= r.position.y and x < r.end.x and y < r.end.y


static func strip(r: Rect2i) -> Rect2i:
	return Rect2i(r.position.x, STRIP_Y, r.size.x, STRIP_H)


static func grow(r: Rect2i, n: int) -> Rect2i:
	return Rect2i(r.position.x - n, r.position.y - n, r.size.x + n * 2, r.size.y + n * 2)


static func center(r: Rect2i) -> Vector2i:
	return Vector2i(floori(r.position.x + r.size.x / 2.0), floori(r.position.y + r.size.y / 2.0))
