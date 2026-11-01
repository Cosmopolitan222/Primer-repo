/* Codificación de vídeo MP4 (H.264) 100 % en el navegador.
 * 1) WebCodecs + mp4-muxer: más rápido que tiempo real y fotograma a fotograma exacto.
 * 2) Si el navegador no tiene WebCodecs: MediaRecorder en tiempo real (MP4 si lo admite, si no WebM). */
(function (KI) {
  'use strict';

  const AVC_CANDIDATES = ['avc1.640028', 'avc1.4d0028', 'avc1.42e028', 'avc1.640033', 'avc1.4d0033'];

  async function pickAvcCodec(width, height, bitrate, fps) {
    if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') return null;
    for (const codec of AVC_CANDIDATES) {
      try {
        const r = await VideoEncoder.isConfigSupported({ codec, width, height, bitrate, framerate: fps, avc: { format: 'avc' } });
        if (r && r.supported) return codec;
      } catch (e) { /* probar el siguiente */ }
    }
    return null;
  }

  const nextTick = () => new Promise((r) => setTimeout(r, 0));

  /**
   * opts: { width, height, fps, bitrate, duration, draw(ctx, t), onProgress(p), isCancelled() }
   * Devuelve { blob, ext, codec, method }.
   */
  KI.encodeVideo = async function (opts) {
    const { width, height, fps = 30, bitrate, duration, draw, onProgress = () => {}, isCancelled = () => false } = opts;
    const codec = await pickAvcCodec(width, height, bitrate, fps);
    if (codec && typeof Mp4Muxer !== 'undefined') {
      return encodeWebCodecs({ width, height, fps, bitrate, duration, draw, onProgress, isCancelled, codec });
    }
    return encodeMediaRecorder({ width, height, fps, bitrate, duration, draw, onProgress, isCancelled });
  };

  async function encodeWebCodecs({ width, height, fps, bitrate, duration, draw, onProgress, isCancelled, codec }) {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });
    const muxer = new Mp4Muxer.Muxer({
      target: new Mp4Muxer.ArrayBufferTarget(),
      video: { codec: 'avc', width, height, frameRate: fps },
      fastStart: 'in-memory',
      firstTimestampBehavior: 'offset',
    });
    let failure = null;
    const encoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (e) => { failure = e; },
    });
    encoder.configure({ codec, width, height, bitrate, framerate: fps, avc: { format: 'avc' } });
    const total = Math.round(duration * fps);
    const frameDur = Math.round(1e6 / fps);
    for (let i = 0; i < total; i++) {
      if (failure) throw failure;
      if (isCancelled()) { try { encoder.close(); } catch (e) { /* nada */ } throw new Error('cancelado'); }
      draw(ctx, i / fps);
      const frame = new VideoFrame(canvas, { timestamp: i * frameDur, duration: frameDur });
      encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
      frame.close();
      // control de cola: no adelantarse demasiado al codificador
      while (encoder.encodeQueueSize > 6) await nextTick();
      if (i % 6 === 0) { onProgress(i / total); await nextTick(); }
    }
    await encoder.flush();
    if (failure) throw failure;
    encoder.close();
    muxer.finalize();
    onProgress(1);
    return { blob: new Blob([muxer.target.buffer], { type: 'video/mp4' }), ext: 'mp4', codec, method: 'webcodecs' };
  }

  function pickRecorderType() {
    if (typeof MediaRecorder === 'undefined') return null;
    const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    return types.find((t) => MediaRecorder.isTypeSupported(t)) || null;
  }

  async function encodeMediaRecorder({ width, height, fps, bitrate, duration, draw, onProgress, isCancelled }) {
    const type = pickRecorderType();
    if (!type) throw new Error('Este navegador no puede crear vídeo. Usa Chrome, Edge o Safari actualizados.');
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    // Algunos navegadores solo capturan canvas visibles: lo dejamos en la página, fuera de la vista.
    canvas.style.cssText = 'position:fixed;left:-99999px;top:0;width:10px;height:10px;';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d', { alpha: false });
    draw(ctx, 0);
    const stream = canvas.captureStream(fps);
    const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: bitrate });
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const done = new Promise((res) => { rec.onstop = res; });
    rec.start(250);
    const t0 = performance.now();
    await new Promise((resolve, reject) => {
      const step = () => {
        if (isCancelled()) { rec.stop(); reject(new Error('cancelado')); return; }
        const t = (performance.now() - t0) / 1000;
        if (t >= duration) { draw(ctx, duration - 0.001); resolve(); return; }
        draw(ctx, t);
        onProgress(t / duration);
        setTimeout(step, 1000 / fps / 2);
      };
      step();
    });
    await new Promise((r) => setTimeout(r, 200));
    rec.stop();
    await done;
    stream.getTracks().forEach((tr) => tr.stop());
    canvas.remove();
    onProgress(1);
    const ext = type.startsWith('video/mp4') ? 'mp4' : 'webm';
    return { blob: new Blob(chunks, { type: type.split(';')[0] }), ext, codec: type, method: 'mediarecorder' };
  }

  KI.videoSupport = async function () {
    const codec = await pickAvcCodec(1080, 1920, 6e6, 30);
    if (codec) return { mode: 'webcodecs', codec };
    const t = pickRecorderType();
    return t ? { mode: 'mediarecorder', codec: t } : { mode: 'none' };
  };
})(window.KI = window.KI || {});
