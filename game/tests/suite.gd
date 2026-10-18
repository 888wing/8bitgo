# 測試的基本工具：每個 test_ 開頭的方法是一個測試，用 about() 寫一句中文說明。
extends RefCounted

var tree: SceneTree
var failures: Array[String] = []
var title := ""


func about(text: String) -> void:
	title = text


func check(cond: bool, msg := "") -> void:
	if not cond:
		failures.append(msg if msg != "" else "條件不成立")


# 數字一律當作浮點數比較：JSON 讀出來的整數是浮點數。
func eq(a: Variant, b: Variant, msg := "") -> void:
	if not same(a, b):
		failures.append("%s：得到 %s，應該是 %s" % [msg if msg != "" else "不相等", str(a), str(b)])


static func same(a: Variant, b: Variant) -> bool:
	var ta := typeof(a)
	var tb := typeof(b)
	if (ta == TYPE_INT or ta == TYPE_FLOAT) and (tb == TYPE_INT or tb == TYPE_FLOAT):
		return is_equal_approx(float(a), float(b))
	if (ta == TYPE_STRING or ta == TYPE_STRING_NAME) and (tb == TYPE_STRING or tb == TYPE_STRING_NAME):
		return String(a) == String(b)
	if ta == TYPE_ARRAY and tb == TYPE_ARRAY:
		if a.size() != b.size():
			return false
		for i in a.size():
			if not same(a[i], b[i]):
				return false
		return true
	if ta == TYPE_DICTIONARY and tb == TYPE_DICTIONARY:
		if a.size() != b.size():
			return false
		for k in a:
			if not b.has(k) or not same(a[k], b[k]):
				return false
		return true
	return ta == tb and a == b
