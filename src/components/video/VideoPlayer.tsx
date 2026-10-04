import { useRef, useState } from 'react';
import {
  Maximize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

/**
 * A real custom player for a DIRECTLY playable video file (master spec,
 * "Video Player UX") - play/pause, seek, time, volume, fullscreen, all with
 * our own controls over a plain <video> element. This is NOT used for
 * Google Drive/OneDrive resources: a share link is an HTML viewer page, not
 * a raw video URL, so there is no <video> element to attach custom controls
 * to, and a cross-origin iframe's internal player cannot be controlled by
 * this page's JavaScript at all. Drive/OneDrive previews render through
 * ResourcePreview -> ProviderPreview's provider-native iframe instead - see
 * that component's comment for why that split is correct, not a shortcut.
 *
 * This component activates automatically the moment any resource's
 * `externalUrl` is an actual direct video file (see
 * src/components/resources/ResourcePreview.tsx for the one-line check) -
 * for example if a future provider is added that does expose one.
 *
 * `qualities`, when provided with more than one entry, renders a quality
 * selector. With zero or one entries, no selector is shown at all - this
 * component never invents a fake resolution choice.
 */
export function VideoPlayer({
  src,
  title,
  qualities,
}: {
  src: string;
  title: string;
  qualities?: { label: string; src: string }[];
}) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [activeSrc, setActiveSrc] = useState(src);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }

  function seekBy(deltaSeconds: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(Math.max(video.currentTime + deltaSeconds, 0), video.duration || 0);
  }

  function seekTo(fraction: number) {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = fraction * video.duration;
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }

  function changeVolume(next: number) {
    const video = videoRef.current;
    if (!video) return;
    video.volume = next;
    video.muted = next === 0;
    setVolume(next);
    setIsMuted(next === 0);
  }

  function toggleFullscreen() {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void container.requestFullscreen();
  }

  function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, '0');
    return `${mins}:${secs}`;
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      ref={containerRef}
      className="group relative aspect-video w-full overflow-hidden rounded-lg bg-black"
    >
      <video
        ref={videoRef}
        src={activeSrc}
        title={title}
        className="size-full"
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        playsInline
      />

      {/* Centered play/pause overlay, shown when paused. */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          aria-label={t('video.play')}
          className="absolute inset-0 flex items-center justify-center bg-black/20"
        >
          <span className="flex size-16 items-center justify-center rounded-full bg-white/90 text-black">
            <Play className="size-7 translate-x-0.5" fill="currentColor" />
          </span>
        </button>
      )}

      {/* Control bar */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          onChange={(e) => seekTo(Number(e.target.value) / 100)}
          aria-label={t('video.seek')}
          className="h-1.5 w-full cursor-pointer accent-accent"
        />

        <div className="flex items-center justify-between gap-2 text-white">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => seekBy(-10)}
              aria-label={t('video.rewind')}
              className="rounded-md p-2 hover:bg-white/10"
            >
              <RotateCcw className="size-4" />
            </button>
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? t('video.pause') : t('video.play')}
              className="rounded-md p-2 hover:bg-white/10"
            >
              {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
            <button
              onClick={() => seekBy(10)}
              aria-label={t('video.forward')}
              className="rounded-md p-2 hover:bg-white/10"
            >
              <RotateCw className="size-4" />
            </button>
            <span className="ms-1 text-xs tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleMute}
              aria-label={isMuted ? t('video.unmute') : t('video.mute')}
              className="rounded-md p-2 hover:bg-white/10"
            >
              <VolumeIcon className="size-4" />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              aria-label={t('video.volume')}
              className="hidden w-16 accent-accent sm:block"
            />
            {/* Only rendered with 2+ real sources - never a fake single-option selector. */}
            {qualities && qualities.length > 1 && (
              <select
                value={activeSrc}
                onChange={(e) => setActiveSrc(e.target.value)}
                aria-label={t('video.quality')}
                className={cn('rounded-md bg-white/10 px-1.5 py-1 text-xs text-white')}
              >
                {qualities.map((q) => (
                  <option key={q.src} value={q.src} className="text-ink">
                    {q.label}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={toggleFullscreen}
              aria-label={t('video.fullscreen')}
              className="rounded-md p-2 hover:bg-white/10"
            >
              <Maximize className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
