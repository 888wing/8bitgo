# 即場合成的音效：印章、翻紙、筆、對白嗶聲。全部很短，很輕。
# 照舊網頁版 sound.js 的做法：振盪器或雜音，經濾波器，再加指數的起落。
extends Node

const RATE := 22050
const SETTINGS := "user://settings.cfg"

var muted := false
var _players: Array[AudioStreamPlayer] = []
var _next := 0


func _ready() -> void:
	for i in 8:
		var p := AudioStreamPlayer.new()
		add_child(p)
		_players.append(p)
	var cfg := ConfigFile.new()
	if cfg.load(SETTINGS) == OK:
		muted = bool(cfg.get_value("sound", "muted", false))


func set_muted(value: bool) -> void:
	muted = value
	var cfg := ConfigFile.new()
	cfg.load(SETTINGS)
	cfg.set_value("sound", "muted", muted)
	cfg.save(SETTINGS)


func blip(freq := 420.0) -> void:
	var n := int(RATE * 0.05)
	var out := PackedFloat32Array()
	out.resize(n)
	for i in n:
		var t := float(i) / RATE
		var sq := 1.0 if fmod(t * freq, 1.0) < 0.5 else -1.0
		out[i] = sq * _env(t, 0.025, 0.003, 0.035)
	_play(out)


# 印章：低頻的一下悶響，加一點木頭的雜音。
func thud() -> void:
	var n := int(RATE * 0.2)
	var out := PackedFloat32Array()
	out.resize(n)
	var phase := 0.0
	for i in n:
		var t := float(i) / RATE
		var f := 140.0 * pow(48.0 / 140.0, minf(t / 0.12, 1.0))
		phase += TAU * f / RATE
		out[i] = sin(phase) * _env(t, 0.6, 0.002, 0.16)
	var thump := _filter(_noise(0.08), "lowpass", 700.0, 0.707)
	for i in thump.size():
		out[i] += thump[i] * _env(float(i) / RATE, 0.35, 0.001, 0.07)
	_play(out)


func paper() -> void:
	_noise_hit(0.16, "bandpass", 2400.0, 0.8, 0.12, 0.01, 0.13)


func pen() -> void:
	_noise_hit(0.04, "highpass", 3500.0, 0.707, 0.05, 0.004, 0.03)


func clack() -> void:
	_noise_hit(0.05, "bandpass", 900.0, 1.0, 0.3, 0.001, 0.05)


func found() -> void:
	var n := int(RATE * 0.37)
	var out := PackedFloat32Array()
	out.resize(n)
	for k in 2:
		var freq: float = [660.0, 990.0][k]
		var start := 0.07 * k
		for i in n:
			var t := float(i) / RATE - start
			if t < 0.0 or t > 0.3:
				continue
			var tri := 4.0 * absf(fmod(t * freq, 1.0) - 0.5) - 1.0
			out[i] += tri * _env(t, 0.06, 0.01, 0.24)
	_play(out)


func _noise_hit(seconds: float, type: String, freq: float, q: float, peak: float, attack: float, release: float) -> void:
	var out := _filter(_noise(seconds), type, freq, q)
	for i in out.size():
		out[i] *= _env(float(i) / RATE, peak, attack, release)
	_play(out)


# 由 0.0001 指數升到 peak，再指數落回 0.0001。
func _env(t: float, peak: float, attack: float, release: float) -> float:
	if t < attack:
		return 0.0001 * pow(peak / 0.0001, t / attack)
	if t < attack + release:
		return peak * pow(0.0001 / peak, (t - attack) / release)
	return 0.0


func _noise(seconds: float) -> PackedFloat32Array:
	var out := PackedFloat32Array()
	out.resize(maxi(1, int(RATE * seconds)))
	for i in out.size():
		out[i] = randf() * 2.0 - 1.0
	return out


# 雙二階濾波器（RBJ 的公式），跟 WebAudio 的 BiquadFilter 同一類。
func _filter(input: PackedFloat32Array, type: String, freq: float, q: float) -> PackedFloat32Array:
	var w0 := TAU * freq / RATE
	var alpha := sin(w0) / (2.0 * q)
	var c := cos(w0)
	var b0 := 0.0
	var b1 := 0.0
	var b2 := 0.0
	match type:
		"lowpass":
			b0 = (1.0 - c) / 2.0
			b1 = 1.0 - c
			b2 = b0
		"highpass":
			b0 = (1.0 + c) / 2.0
			b1 = -(1.0 + c)
			b2 = b0
		_:
			b0 = alpha
			b2 = -alpha
	var a0 := 1.0 + alpha
	var a1 := -2.0 * c
	var a2 := 1.0 - alpha
	var out := PackedFloat32Array()
	out.resize(input.size())
	var x1 := 0.0
	var x2 := 0.0
	var y1 := 0.0
	var y2 := 0.0
	for i in input.size():
		var x := input[i]
		var y := (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0
		out[i] = y
		x2 = x1
		x1 = x
		y2 = y1
		y1 = y
	return out


func _play(samples: PackedFloat32Array) -> void:
	if muted:
		return
	var data := PackedByteArray()
	data.resize(samples.size() * 2)
	for i in samples.size():
		data.encode_s16(i * 2, int(clampf(samples[i], -1.0, 1.0) * 32767.0))
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = RATE
	stream.data = data
	var p := _players[_next]
	_next = (_next + 1) % _players.size()
	p.stream = stream
	p.play()
