# 放大倍數（docs/06-art.md §2）：用實際像素計算；網頁版四邊留 16、8 個 CSS 像素。
extends "res://tests/suite.gd"

const Fit := preload("res://scripts/desk/fit.gd")


func _k(css: Vector2, dpr: float, touch: bool, pad := Vector2(16, 8)) -> float:
	return Fit.scale_for((css - pad * 2.0) * dpr, touch)


func test_scale() -> void:
	about("放大：1080p 全螢幕 ×4、4K ×8、1280×720 網頁 ×2；手機橫放 ×4，網址列佔去高度時 ×3.6")
	eq(_k(Vector2(1920, 1080), 1, false, Vector2.ZERO), 4.0, "1080p")
	eq(_k(Vector2(3840, 2160), 1, false, Vector2.ZERO), 8.0, "4K")
	eq(_k(Vector2(1280, 720), 1, false), 2.0, "1280×720")
	eq(_k(Vector2(844, 390), 3, true), 4.0, "844×390")
	eq(_k(Vector2(844, 340), 3, true), 3.6, "844×340")
	eq(_k(Vector2(844, 340), 3, false), 3.0, "844×340 沒有觸控：只用整數倍")
	eq(_k(Vector2(390, 844), 3, true), 2.0, "390×844 直放")


func test_rotate() -> void:
	about("手機直放才提示橫放")
	check(Fit.wants_rotate(Vector2(1170, 2532), 3), "390×844")
	check(not Fit.wants_rotate(Vector2(2532, 1170), 3), "844×390")
	check(not Fit.wants_rotate(Vector2(1000, 1400), 1), "直放的大螢幕")
