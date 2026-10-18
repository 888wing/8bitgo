# 無頭測試：godot --headless --path game -s res://tests/run.gd
# 逐個載入 tests/ 裡 test_ 開頭的檔案，執行每個 test_ 開頭的方法；有失敗就以 1 結束。
# 只跑某些檔案：在 -- 後面寫檔名的一部分，例如 -- rules
extends SceneTree


func _init() -> void:
	_run.call_deferred()


func _run() -> void:
	var only := Array(OS.get_cmdline_user_args())
	var passed := 0
	var failed := 0
	var files := Array(DirAccess.get_files_at("res://tests"))
	files.sort()
	for file: String in files:
		if not (file.begins_with("test_") and file.ends_with(".gd")):
			continue
		if only.size() and not only.any(func(o: String) -> bool: return file.contains(o)):
			continue
		var script: GDScript = load("res://tests/" + file)
		for m in script.get_script_method_list():
			var name: String = m.name
			if not name.begins_with("test_"):
				continue
			var suite: Variant = script.new()
			suite.tree = self
			await suite.call(name)
			var label: String = suite.title if suite.title != "" else name
			if suite.failures.is_empty():
				passed += 1
				print("✔ %s" % label)
			else:
				failed += 1
				print("✖ %s（%s %s）" % [label, file, name])
				for f in suite.failures:
					print("    ", f)
	print("測試 %d 個：%d 過，%d 失敗" % [passed + failed, passed, failed])
	quit(1 if failed else 0)
