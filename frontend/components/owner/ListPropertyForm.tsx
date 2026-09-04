"use client";

import Image from "next/image";
import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createOwnerProperty } from "@/lib/api";
import { useOwner } from "@/components/owner/OwnerProvider";
import OwnerPageMotion from "@/components/owner/OwnerPageMotion";
import CustomSelect from "@/components/ui/CustomSelect";

type Preview = {
  id: string;
  file: File;
  url: string;
};

const PROPERTY_TYPES = [
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
  { value: "office", label: "Office" },
  { value: "shop", label: "Shop" },
];

const STATUS_OPTIONS = [
  { value: "rent", label: "For Rent" },
  { value: "sale", label: "For Sale" },
];

export default function ListPropertyForm() {
  const router = useRouter();
  const { refreshProperties } = useOwner();
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [propertyType, setPropertyType] = useState("apartment");
  const [status, setStatus] = useState("rent");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
    // Only revoke on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (list.length === 0) {
      setErrors((prev) => ({
        ...prev,
        images: "Please choose image files (JPG, PNG, WebP, etc.).",
      }));
      return;
    }

    setPreviews((prev) => {
      const next = [
        ...prev,
        ...list.map((file) => ({
          id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
          file,
          url: URL.createObjectURL(file),
        })),
      ];
      return next;
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next.images;
      return next;
    });
  }, []);

  function removePreview(id: string) {
    setPreviews((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  }

  function validateLocal(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Title is required.";
    if (!description.trim()) next.description = "Description is required.";
    if (!propertyType) next.property_type = "Select a property type.";
    if (!status) next.status = "Select For Rent or For Sale.";
    if (!location.trim()) next.location = "Location is required.";
    if (!price.trim()) {
      next.price = "Price is required.";
    } else if (Number.isNaN(Number(price)) || Number(price) <= 0) {
      next.price = "Enter a valid price greater than zero.";
    }
    if (previews.length === 0) {
      next.images = "Add at least one photo of the property.";
    }
    return next;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const localErrors = validateLocal();
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});

    const result = await createOwnerProperty({
      title: title.trim(),
      description: description.trim(),
      property_type: propertyType,
      location: location.trim(),
      price: price.trim(),
      status,
      images: previews.map((p) => p.file),
    });

    if (!result.ok) {
      setErrors(result.errors);
      setSubmitting(false);
      return;
    }

    await refreshProperties();
    router.push(`/owner/properties`);
    router.refresh();
  }

  return (
    <OwnerPageMotion>
      <header className="reveal-item border-b border-line pb-8">
        <p className="eyebrow text-accent">New listing</p>
        <h1 className="display mt-3 text-[clamp(2.2rem,5vw,3.5rem)] text-ink">
          List a property
        </h1>
        <p className="mt-4 max-w-xl text-base font-light leading-relaxed text-ink-soft">
          Put your property in front of people looking for their next place.
        </p>
      </header>

      <form onSubmit={onSubmit} className="mt-10 space-y-10" noValidate>
        {errors.form ? <div className="form-error reveal-item">{errors.form}</div> : null}

        <section className="reveal-item border border-line bg-bg-raised p-5 sm:p-8">
          <div className="border-b border-line pb-5">
            <p className="eyebrow text-accent">01</p>
            <h2 className="display mt-2 text-2xl text-ink sm:text-3xl">
              Property basics
            </h2>
          </div>

          <div className="mt-6 grid gap-5">
            <div className="field">
              <label htmlFor="title">
                Title <span className="text-accent">*</span>
              </label>
              <input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={submitting}
                placeholder="e.g. Bright apartment in Piassa"
                required
              />
              {errors.title ? <p className="field-error">{errors.title}</p> : null}
            </div>

            <div className="field">
              <label htmlFor="description">
                Description <span className="text-accent">*</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={submitting}
                placeholder="Describe the space, neighbourhood, and what makes it right for someone."
                required
              />
              {errors.description ? (
                <p className="field-error">{errors.description}</p>
              ) : null}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="field">
                <label htmlFor="property_type">
                  Property type <span className="text-accent">*</span>
                </label>
                <CustomSelect
                  id="property_type"
                  name="property_type"
                  value={propertyType}
                  options={PROPERTY_TYPES}
                  onChange={setPropertyType}
                  disabled={submitting}
                  aria-label="Property type"
                />
                {errors.property_type ? (
                  <p className="field-error">{errors.property_type}</p>
                ) : null}
              </div>

              <div className="field">
                <label htmlFor="status">
                  Status <span className="text-accent">*</span>
                </label>
                <CustomSelect
                  id="status"
                  name="status"
                  value={status}
                  options={STATUS_OPTIONS}
                  onChange={setStatus}
                  disabled={submitting}
                  aria-label="Status"
                />
                {errors.status ? (
                  <p className="field-error">{errors.status}</p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="field">
                <label htmlFor="location">
                  Location <span className="text-accent">*</span>
                </label>
                <input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={submitting}
                  placeholder="Addis Ababa, Bole"
                  required
                />
                {errors.location ? (
                  <p className="field-error">{errors.location}</p>
                ) : null}
              </div>

              <div className="field">
                <label htmlFor="price">
                  Price (ETB) <span className="text-accent">*</span>
                </label>
                <input
                  id="price"
                  type="number"
                  min="1"
                  step="1"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={submitting}
                  placeholder={status === "rent" ? "Monthly rent" : "Sale price"}
                  required
                />
                {errors.price ? (
                  <p className="field-error">{errors.price}</p>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="reveal-item border border-line bg-bg-raised p-5 sm:p-8">
          <div className="border-b border-line pb-5">
            <p className="eyebrow text-accent">02</p>
            <h2 className="display mt-2 text-2xl text-ink sm:text-3xl">
              Property images
            </h2>
            <p className="mt-2 text-sm font-light text-ink-muted">
              The first photo becomes the primary image on your listing.
            </p>
          </div>

          <div className="mt-6">
            <input
              ref={fileInputRef}
              id={inputId}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              disabled={submitting}
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />

            <div
              role="button"
              tabIndex={0}
              className={`upload-zone ${dragging ? "is-dragging" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
              }}
            >
              <p className="eyebrow text-accent">Photos</p>
              <p className="display mt-3 text-2xl text-ink">
                Drop images here, or browse
              </p>
              <p className="mt-2 text-sm font-light text-ink-muted">
                JPG, PNG, or WebP. Add as many as you need.
              </p>
            </div>
            {errors.images ? (
              <p className="field-error mt-3">{errors.images}</p>
            ) : null}

            {previews.length > 0 ? (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {previews.map((preview, index) => (
                  <div
                    key={preview.id}
                    className={`upload-preview ${index === 0 ? "is-primary" : ""}`}
                  >
                    <Image
                      src={preview.url}
                      alt={preview.file.name}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                    {index === 0 ? (
                      <span className="absolute left-2 top-2 border border-accent bg-bg/80 px-2 py-1 text-[0.6rem] uppercase tracking-[0.14em] text-accent backdrop-blur-sm">
                        Primary
                      </span>
                    ) : null}
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => removePreview(preview.id)}
                      className="absolute bottom-2 right-2 border border-line-strong bg-bg/85 px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em] text-ink hover:border-ink"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="reveal-item border border-line bg-bg-raised p-5 sm:p-8">
          <div className="border-b border-line pb-5">
            <p className="eyebrow text-accent">03</p>
            <h2 className="display mt-2 text-2xl text-ink sm:text-3xl">
              Publish
            </h2>
            <p className="mt-2 max-w-lg text-sm font-light leading-relaxed text-ink-soft">
              When you publish, this listing is saved to Delala under your owner
              account and appears in My Properties.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? "Publishing…" : "Publish property"}
            </button>
            <Link
              href="/owner/properties"
              className={`btn btn-ghost ${submitting ? "pointer-events-none opacity-50" : ""}`}
            >
              Cancel
            </Link>
          </div>
        </section>
      </form>
    </OwnerPageMotion>
  );
}
