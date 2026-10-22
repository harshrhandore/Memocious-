"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import {
  Maximize2,
  Plus,
  Minus,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
export function Gallery({
  image,
  name,
  images,
  demo = false,
}: {
  image: string;
  name: string;
  images?: { url: string; alt: string }[];
  demo?: boolean;
}) {
  const pictures = images?.length
    ? images
    : [{ url: image, alt: `${name}${demo ? " — illustrative sample" : ""}` }];
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0),
    [zoom, setZoom] = useState(1);
  const start = useRef<{ x: number; y: number } | null>(null),
    pinch = useRef<number | null>(null);
  const move = (n: number) => {
    setIndex((i) => (i + n + pictures.length) % pictures.length);
    setZoom(1);
  };
  const current = pictures[index] ?? pictures[0];
  return (
    <div>
      <fieldset
        className="gallery-main"
        tabIndex={pictures.length > 1 ? 0 : undefined}
        aria-label="Gift photographs"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            move(1);
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            move(-1);
          }
        }}
        onTouchStart={(e) => {
          if (e.touches.length === 1)
            start.current = {
              x: e.touches[0].clientX,
              y: e.touches[0].clientY,
            };
        }}
        onTouchEnd={(e) => {
          if (start.current && e.changedTouches.length) {
            const dx = e.changedTouches[0].clientX - start.current.x,
              dy = e.changedTouches[0].clientY - start.current.y;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy))
              move(dx < 0 ? 1 : -1);
          }
          start.current = null;
        }}
      >
        <legend className="sr-only">Gift photographs</legend>
        <Image
          src={current.url}
          alt={current.alt}
          width={640}
          height={640}
          priority
          unoptimized={!demo}
          sizes="(max-width:767px) 100vw,50vw"
        />
        <button
          type="button"
          className="zoom-button"
          onClick={() => dialog.current?.showModal()}
          aria-label="Enlarge gift image"
        >
          <Maximize2 size={18} />
        </button>
      </fieldset>
      {pictures.length > 1 && (
        <div className="flex items-center justify-between my-2">
          <button
            type="button"
            className="icon-button"
            aria-label="Previous photograph"
            onClick={() => move(-1)}
          >
            <ChevronLeft />
          </button>
          <span aria-live="polite">
            {index + 1} / {pictures.length}
          </span>
          <button
            type="button"
            className="icon-button"
            aria-label="Next photograph"
            onClick={() => move(1)}
          >
            <ChevronRight />
          </button>
        </div>
      )}
      <div className="gallery-thumbs">
        {pictures.map((p, i) => (
          <button
            key={p.url}
            type="button"
            aria-label={`View photograph ${i + 1}`}
            aria-pressed={index === i}
            onClick={() => {
              setIndex(i);
              setZoom(1);
            }}
          >
            <Image
              src={p.url}
              alt=""
              width={68}
              height={68}
              unoptimized={!demo}
            />
          </button>
        ))}
      </div>
      {demo && (
        <p className="gallery-caption">
          Illustrative sample design · Genuine product photography coming with
          the catalogue.
        </p>
      )}
      <dialog
        ref={dialog}
        aria-label="Enlarged gift image"
        className="zoom-dialog"
        onClose={() => {
          setZoom(1);
          pinch.current = null;
        }}
      >
        <button
          type="button"
          className="icon-button"
          aria-label="Close enlarged image"
          onClick={() => dialog.current?.close()}
        >
          <X />
        </button>
        <div
          className="zoom-scroll"
          onTouchStart={(e) => {
            if (e.touches.length === 2)
              pinch.current = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY,
              );
          }}
          onTouchMove={(e) => {
            if (e.touches.length === 2 && pinch.current) {
              const distance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY,
              );
              const scale = distance / pinch.current;
              setZoom((z) => Math.min(3, Math.max(1, z * scale)));
              pinch.current = distance;
            }
          }}
          onTouchEnd={() => {
            pinch.current = null;
          }}
        >
          <Image
            src={current.url}
            alt={current.alt}
            width={Math.round(640 * zoom)}
            height={Math.round(640 * zoom)}
            unoptimized
          />
        </div>
        <div className="zoom-tools">
          <button
            type="button"
            className="icon-button"
            aria-label="Zoom out"
            disabled={zoom <= 1}
            onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
          >
            <Minus />
          </button>
          <span aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="icon-button"
            aria-label="Zoom in"
            disabled={zoom >= 3}
            onClick={() => setZoom((z) => Math.min(3, z + 0.5))}
          >
            <Plus />
          </button>
        </div>
      </dialog>
    </div>
  );
}
