# 開發用：開一個真的視窗，推進到第一位證人說完證物，截圖，再結束。
# godot --path game res://tools/capture.tscn -- --out=/某處/desk.png
extends Node

var out := "user://capture.png"


func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--out="):
			out = a.substr(6)
	get_window().unfocusable = true
	var main: Node = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	await _wait(0.5)
	var desk: Node = main.desk
	desk.close_modal()
	for i in 400:
		if desk.docs.size() >= 3 and not desk.docs[2].arriving and desk.writing.is_empty():
			break
		desk.advance()
		await _wait(0.05)
	await _wait(0.5)
	RenderingServer.force_draw(false)
	await get_tree().process_frame
	var img := get_viewport().get_texture().get_image()
	img.save_png(out)
	print("CAPTURE view=", JSON.stringify(main.state().view), " window=", DisplayServer.window_get_size(), " scale=", DisplayServer.screen_get_scale())
	get_tree().quit()


func _wait(seconds: float) -> void:
	var t := 0.0
	while t < seconds:
		await get_tree().process_frame
		t += get_process_delta_time()
